export type ImagingType =
  | "panoramica"
  | "periapical"
  | "aleta_mordida"
  | "oclusal"
  | "tomografia"
  | "otra"

export interface PatientImageRow {
  id: string
  patient_id: string
  image_type: ImagingType
  description: string | null
  bucket_id: string
  file_path: string
  file_name: string
  uploaded_by: string
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface DeletedPatientImageRow extends PatientImageRow {
  deleted_by_name: string | null
}

export interface PatientImageWithUrl extends PatientImageRow {
  signed_url: string
}
