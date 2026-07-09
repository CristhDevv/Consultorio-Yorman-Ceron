// ============================================================
// CONFIGURACIÓN: Citas y Agenda (Módulo de Disponibilidad)
// ============================================================

/**
 * Días laborales de la semana.
 * Convención: 1 (Lunes) a 5 (Viernes).
 * 
 * [NOTA PROVISIONAL DE LÍDER TÉCNICO]:
 * Este es un valor provisional definido en ausencia de una especificación
 * final de negocio. Debe confirmarse antes de pasar a producción.
 */
export const BUSINESS_DAYS = [1, 2, 3, 4, 5];

/**
 * Hora de inicio laboral (formato 24 horas).
 * Representa las 08:00 AM.
 * 
 * [NOTA PROVISIONAL DE LÍDER TÉCNICO]:
 * Este es un valor provisional definido en ausencia de una especificación
 * final de negocio. Debe confirmarse antes de pasar a producción.
 */
export const BUSINESS_START_HOUR = 8;

/**
 * Hora de término laboral (formato 24 horas).
 * Representa las 06:00 PM. Las citas pueden terminar hasta esta hora.
 * 
 * [NOTA PROVISIONAL DE LÍDER TÉCNICO]:
 * Este es un valor provisional definido en ausencia de una especificación
 * final de negocio. Debe confirmarse antes de pasar a producción.
 */
export const BUSINESS_END_HOUR = 18;

/**
 * Duración en minutos de cada bloque de cita.
 * Valor por defecto de 30 minutos.
 * 
 * [NOTA PROVISIONAL DE LÍDER TÉCNICO]:
 * Este es un valor provisional definido en ausencia de una especificación
 * final de negocio. Debe confirmarse antes de pasar a producción.
 */
export const SLOT_DURATION_MINUTES = 30;
