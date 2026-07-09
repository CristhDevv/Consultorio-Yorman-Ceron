// ============================================================
// CONFIGURACIÓN: Citas y Agenda (Módulo de Disponibilidad)
// ============================================================

/**
 * Horas laborales por defecto redefinidas a formato libre de 24 horas.
 * Habilita agendamiento continuo sin restricción de horario.
 */
export const BUSINESS_START_HOUR = 0;
export const BUSINESS_END_HOUR = 24;

/**
 * Duración en minutos por defecto de cada bloque de cita.
 */
export const SLOT_DURATION_MINUTES = 30;

/**
 * Tipos de cita y sus duraciones correspondientes en minutos.
 */
export type AppointmentType = 'primera_consulta' | 'control' | 'limpieza' | 'urgencia';

export const APPOINTMENT_DURATIONS: Record<AppointmentType, number> = {
  primera_consulta: 60,
  control: 30,
  limpieza: 45,
  urgencia: 30,
};

/**
 * Obtiene la duración final en minutos de una cita, aplicando el tipo de cita
 * y soportando un override manual explícito como prioridad.
 */
export function getAppointmentDuration(
  type: AppointmentType,
  manualOverrideMinutes?: number | null
): number {
  if (manualOverrideMinutes !== undefined && manualOverrideMinutes !== null && manualOverrideMinutes > 0) {
    return manualOverrideMinutes;
  }
  return APPOINTMENT_DURATIONS[type] || SLOT_DURATION_MINUTES;
}

/**
 * Buffer estándar entre citas (en minutos) para el odontólogo.
 */
export const BUFFER_TIME_MINUTES = 10;

/**
 * Obtiene el buffer de tiempo (en minutos) requerido después de una cita.
 * Se exceptúa el tipo 'urgencia', el cual no posee buffer de tiempo (retorna 0).
 */
export function getBufferTimeForType(type: AppointmentType): number {
  if (type === 'urgencia') {
    return 0;
  }
  return BUFFER_TIME_MINUTES;
}
