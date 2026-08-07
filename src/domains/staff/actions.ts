"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { resolveActiveBranch } from "@/domains/branches/session"
import { ALL_BRANCHES_VALUE } from "@/domains/branches/constants"

export interface StaffProfile {
  id: string
  full_name: string | null
  role: string
  phone: string | null
  created_at: string
  dentist_branches?: {
    branch_id: string
    branches: {
      name: string
    } | null
  }[]
}

export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string }

// 1. Obtener listado de miembros del personal (odontólogos y administradores)
export async function getStaffMembers(): Promise<StaffProfile[]> {
  const supabase = await createClient()

  // Comprobar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("No autorizado. Inicie sesión.")
  }

  // Comprobar rol de administrador
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
    throw new Error("Acceso denegado. Solo administradores pueden listar personal.")
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      phone,
      created_at,
      dentist_branches(
        branch_id,
        branches(name)
      )
    `)
    .in("role", ["administrador", "odontologo"])
    .order("full_name")

  if (error) {
    throw new Error(`Error al obtener personal: ${error.message}`)
  }

  let staffList = data as StaffProfile[]

  // Filtramos la lista según la sucursal activa seleccionada.
  // Los administradores se muestran siempre (acceso global).
  // Los odontólogos se filtran para que solo aparezcan si están asociados a la sucursal activa.
  const { activeBranchId } = await resolveActiveBranch(user.id, profile.role)
  if (activeBranchId && activeBranchId !== ALL_BRANCHES_VALUE) {
    staffList = staffList.filter((member) =>
      member.role === "administrador" ||
      (member.dentist_branches && member.dentist_branches.some((db) => db.branch_id === activeBranchId))
    )
  }

  return staffList
}

// 2. Crear un nuevo miembro del personal
export async function createStaffMember(input: {
  fullName: string
  email: string
  role: "odontologo" | "administrador"
  phone?: string
}): Promise<ActionResult<StaffProfile>> {
  const supabase = await createClient()

  // Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "No hay sesión activa." }
  }

  // Validar rol administrador
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
    return { success: false, error: "Acceso denegado. Solo administradores pueden gestionar personal." }
  }

  if (!input.fullName || input.fullName.trim() === "") {
    return { success: false, error: "El nombre completo no puede estar vacío." }
  }
  if (!input.email || input.email.trim() === "") {
    return { success: false, error: "El correo electrónico no puede estar vacío." }
  }

  // Crear cliente stateless anon
  const anonClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Registramos al usuario. Usamos contraseña por defecto para que luego la actualice.
  const tempPassword = "StaffPassword123!"

  const { data: authData, error: signUpError } = await anonClient.auth.signUp({
    email: input.email.trim(),
    password: tempPassword,
    options: {
      data: {
        full_name: input.fullName.trim(),
        role: input.role,
      },
    },
  })

  if (signUpError) {
    return { success: false, error: signUpError.message }
  }

  // Controlar éxito falso por correo duplicado (obfuscación de Supabase)
  if (authData.user && (!authData.user.identities || authData.user.identities.length === 0)) {
    return { success: false, error: "El correo electrónico ya está registrado en el sistema." }
  }

  const newUserId = authData.user?.id

  if (!newUserId) {
    return { success: false, error: "No se pudo obtener el ID del usuario creado." }
  }

  // Si tiene teléfono, actualizamos la tabla profiles
  if (input.phone) {
    await supabase
      .from("profiles")
      .update({ phone: input.phone })
      .eq("id", newUserId)
  }

  revalidatePath("/staff")

  return {
    success: true,
    data: {
      id: newUserId,
      full_name: input.fullName,
      role: input.role,
      phone: input.phone || null,
      created_at: new Date().toISOString(),
    },
  }
}

// 3. Degradar a miembro del personal (remueve accesos cambiándolo a 'paciente')
export async function demoteStaffMember(staffId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "No hay sesión activa." }
  }

  // Evitar degradarse a sí mismo
  if (user.id === staffId) {
    return { success: false, error: "No puedes degradar tu propia cuenta administradora." }
  }

  // Validar rol administrador
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
    return { success: false, error: "Acceso denegado. Solo administradores pueden degradar personal." }
  }

  // Actualizamos el rol a paciente en profiles
  const { error } = await supabase
    .from("profiles")
    .update({ role: "paciente", updated_at: new Date().toISOString() })
    .eq("id", staffId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/staff")
  revalidatePath("/patients")
  return { success: true, data: null }
}

// 4. Cambiar rol de personal (ej: odontologo a administrador o viceversa)
export async function changeStaffRole(
  staffId: string,
  newRole: "odontologo" | "administrador"
): Promise<ActionResult> {
  const supabase = await createClient()

  // Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "No hay sesión activa." }
  }

  // Evitar cambiarse el rol a sí mismo
  if (user.id === staffId) {
    return { success: false, error: "No puedes cambiar tu propio rol en esta pantalla." }
  }

  // Validar rol administrador
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
    return { success: false, error: "Acceso denegado. Solo administradores pueden cambiar roles." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", staffId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/staff")
  return { success: true, data: null }
}

// 5. Obtener listado de sucursales activas en el sistema
export async function getActiveBranches(): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("is_active", true)
    .order("name")

  if (error) {
    throw new Error(`Error al obtener sucursales: ${error.message}`)
  }
  return data || []
}

// 6. Actualizar las sucursales asignadas a un odontólogo
export async function updateDentistBranches(
  dentistId: string,
  branchIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()

  // Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "No hay sesión activa." }
  }

  // Validar rol administrador
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrador") {
    return { success: false, error: "Acceso denegado. Solo administradores pueden gestionar sucursales de odontólogos." }
  }

  // Limpiar sucursales previas
  const { error: deleteError } = await supabase
    .from("dentist_branches")
    .delete()
    .eq("dentist_id", dentistId)

  if (deleteError) {
    return { success: false, error: `Error al limpiar sucursales previas: ${deleteError.message}` }
  }

  // Insertar nuevas asociaciones
  if (branchIds.length > 0) {
    const insertRows = branchIds.map((branchId) => ({
      dentist_id: dentistId,
      branch_id: branchId,
    }))

    const { error: insertError } = await supabase
      .from("dentist_branches")
      .insert(insertRows)

    if (insertError) {
      return { success: false, error: `Error al asociar sucursales: ${insertError.message}` }
    }
  }

  revalidatePath("/staff")
  return { success: true, data: null }
}
