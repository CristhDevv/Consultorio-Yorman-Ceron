"use server"

import { createClient } from "@/shared/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface PatientInput {
  full_name: string
  document_id: string
  phone: string
  email: string
  birth_date: string
  address: string
  allergies: string
  diseases: string
  current_medications: string
  medical_observations: string
}

// 1. Obtener listado de pacientes con buscador
export async function getPatients(query: string = "") {
  const supabase = await createClient()

  let request = supabase.from("patients").select("*").order("full_name")

  if (query) {
    request = request.or(
      `full_name.ilike.%${query}%,document_id.ilike.%${query}%,phone.ilike.%${query}%`
    )
  }

  const { data, error } = await request

  if (error) {
    throw new Error(`Error al obtener pacientes: ${error.message}`)
  }

  return data || []
}

// 2. Obtener detalle de un paciente específico
export async function getPatientById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(`Error al obtener detalle del paciente: ${error.message}`)
  }

  return data
}

// 3. Crear un paciente nuevo
export async function createPatient(input: PatientInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Sesión no iniciada" }
  }

  const { error } = await supabase.from("patients").insert({
    full_name: input.full_name,
    document_id: input.document_id,
    phone: input.phone || null,
    email: input.email || null,
    birth_date: input.birth_date,
    address: input.address || null,
    allergies: input.allergies || null,
    diseases: input.diseases || null,
    current_medications: input.current_medications || null,
    medical_observations: input.medical_observations || null,
    created_by: user.id,
  })

  if (error) {
    // Control de error de clave duplicada (PostgreSQL error 23505)
    if (error.code === "23505") {
      return {
        success: false,
        error: "Ya existe un paciente registrado con esta cédula o documento de identidad.",
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/patients")
  return { success: true }
}

// 4. Editar un paciente existente
export async function updatePatient(id: string, input: Partial<PatientInput>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("patients")
    .update({
      full_name: input.full_name,
      document_id: input.document_id,
      phone: input.phone || null,
      email: input.email || null,
      birth_date: input.birth_date,
      address: input.address || null,
      allergies: input.allergies || null,
      diseases: input.diseases || null,
      current_medications: input.current_medications || null,
      medical_observations: input.medical_observations || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Ya existe otro paciente registrado con esta cédula o documento de identidad.",
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath("/patients")
  revalidatePath(`/patients/${id}`)
  return { success: true }
}
