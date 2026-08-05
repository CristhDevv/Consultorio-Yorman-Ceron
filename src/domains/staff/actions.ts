"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export interface StaffProfile {
  id: string
  full_name: string | null
  role: string
  phone: string | null
  created_at: string
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
    .select("id, full_name, role, phone, created_at")
    .in("role", ["administrador", "odontologo"])
    .order("full_name")

  if (error) {
    throw new Error(`Error al obtener personal: ${error.message}`)
  }

  return data as StaffProfile[]
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
