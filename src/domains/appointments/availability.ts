import { BUSINESS_START_HOUR, BUSINESS_END_HOUR, SLOT_DURATION_MINUTES, AppointmentType, getAppointmentDuration, getBufferTimeForType } from "./config";

export interface Slot {
  starts_at: string; // ISO 8601 UTC
  duration_minutes: number;
}

interface AppointmentMock {
  starts_at: string;
  duration_minutes: number;
  status: string;
  appointment_type?: AppointmentType;
}

/**
 * Calcula los bloques de horario disponibles para un odontólogo en una fecha específica,
 * excluyendo aquellos bloques que se solapen con citas existentes activas.
 * 
 * @param dentistId ID del odontólogo
 * @param dateStr Fecha en formato YYYY-MM-DD
 * @param existingAppointments Citas existentes para el odontólogo en esa fecha
 * @param appointmentType Tipo de la cita candidata
 * @param manualOverrideMinutes Duración manual opcional (override) para la cita candidata
 * @returns Lista de bloques disponibles (slots)
 */
export function getAvailableSlots(
  dentistId: string,
  dateStr: string,
  existingAppointments: AppointmentMock[],
  appointmentType: AppointmentType = 'control',
  manualOverrideMinutes?: number | null
): Slot[] {
  const slots: Slot[] = [];

  const startMin = BUSINESS_START_HOUR * 60;
  const endMin = BUSINESS_END_HOUR * 60;

  // Determinar la duración real del slot candidato aplicando reglas de negocio
  const candidateDuration = getAppointmentDuration(appointmentType, manualOverrideMinutes);

  // Filtrar citas activas (se omiten canceladas y no_asistio ya que no bloquean horario)
  const activeAppointments = existingAppointments.filter(
    (app) => app.status !== "cancelada" && app.status !== "no_asistio"
  );

  const pad = (num: number) => num.toString().padStart(2, "0");

  for (let currentMin = startMin; currentMin < endMin; currentMin += SLOT_DURATION_MINUTES) {
    const slotEndMin = currentMin + candidateDuration;
    if (slotEndMin > endMin) break;

    const hour = Math.floor(currentMin / 60);
    const minute = currentMin % 60;

    // Generar la fecha de inicio del slot en formato ISO UTC para consistencia
    const slotStartStr = `${dateStr}T${pad(hour)}:${pad(minute)}:00.000Z`;
    const slotStartMs = new Date(slotStartStr).getTime();
    const slotEndMs = slotStartMs + candidateDuration * 60 * 1000;

    // Validar solapamiento: (slotStart < appEnd + buffer) AND (appStart < slotEnd)
    const hasOverlap = activeAppointments.some((app) => {
      const appStartMs = new Date(app.starts_at).getTime();
      const appType = (app.appointment_type || 'control') as AppointmentType;
      const bufferMs = getBufferTimeForType(appType) * 60 * 1000;
      const appEndMs = appStartMs + app.duration_minutes * 60 * 1000 + bufferMs;

      return slotStartMs < appEndMs && appStartMs < slotEndMs;
    });

    if (!hasOverlap) {
      slots.push({
        starts_at: slotStartStr,
        duration_minutes: candidateDuration,
      });
    }
  }

  return slots;
}
