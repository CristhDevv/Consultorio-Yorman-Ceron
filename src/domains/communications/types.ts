export type CommunicationChannel = "email" | "sms" | "whatsapp"
export type CommunicationEventType = "confirmation" | "reminder" | "manual"
export type CommunicationStatus = "pending" | "sent" | "failed"

export interface CommunicationLog {
  id: string
  appointment_id: string
  patient_id: string
  channel: CommunicationChannel
  event_type: CommunicationEventType
  status: CommunicationStatus
  created_at: string
  sent_at: string | null
  error_message: string | null
  created_by: string
}

export type CommunicationLogInput = {
  appointmentId: string
  patientId: string
  channel: CommunicationChannel
  eventType: CommunicationEventType
}

export type UpdateCommunicationStatusInput = {
  logId: string
  status: CommunicationStatus
  sentAt?: string | null
  errorMessage?: string | null
}
