import { describe, it, expect } from 'vitest';
import { getAvailableSlots } from '../availability';
import { BUSINESS_START_HOUR, BUSINESS_END_HOUR, SLOT_DURATION_MINUTES } from '../config';

describe('getAvailableSlots availability calculator', () => {
  const dentistId = 'dentist-123';
  const dateStr = '2026-07-06';

  // Número total esperado de slots para un día laboral libre
  const totalExpectedSlots = ((BUSINESS_END_HOUR - BUSINESS_START_HOUR) * 60) / SLOT_DURATION_MINUTES;

  it('should return all slots when there are no existing appointments', () => {
    // Act
    const result = getAvailableSlots(dentistId, dateStr, []);

    // Assert
    expect(result.length).toBe(totalExpectedSlots);
    expect(result[0].starts_at).toBe(`${dateStr}T08:00:00.000Z`);
    expect(result[result.length - 1].starts_at).toBe(`${dateStr}T17:30:00.000Z`);
  });

  it('should exclude only the corresponding block of a 30-minute active appointment', () => {
    // Arrange
    const existing = [
      {
        starts_at: `${dateStr}T09:00:00.000Z`,
        duration_minutes: 30,
        status: 'programada',
      },
    ];

    // Act
    const result = getAvailableSlots(dentistId, dateStr, existing);

    // Assert
    expect(result.length).toBe(totalExpectedSlots - 1);
    // Verificar que el bloque de las 09:00 no existe en la lista de slots disponibles
    const hasNineAm = result.some((slot) => slot.starts_at === `${dateStr}T09:00:00.000Z`);
    expect(hasNineAm).toBe(false);
    // Verificar que el bloque de las 08:30 y las 09:30 sí están disponibles
    const hasEightThirtyAm = result.some((slot) => slot.starts_at === `${dateStr}T08:30:00.000Z`);
    const hasNineThirtyAm = result.some((slot) => slot.starts_at === `${dateStr}T09:30:00.000Z`);
    expect(hasEightThirtyAm).toBe(true);
    expect(hasNineThirtyAm).toBe(true);
  });

  it('should exclude all blocks occupied by a longer appointment (e.g. 60 minutes)', () => {
    // Arrange
    const existing = [
      {
        starts_at: `${dateStr}T10:00:00.000Z`,
        duration_minutes: 60, // Abarca las 10:00 y las 10:30
        status: 'confirmada',
      },
    ];

    // Act
    const result = getAvailableSlots(dentistId, dateStr, existing);

    // Assert
    expect(result.length).toBe(totalExpectedSlots - 2);
    // Verificar exclusión de 10:00 y 10:30
    const hasTenAm = result.some((slot) => slot.starts_at === `${dateStr}T10:00:00.000Z`);
    const hasTenThirtyAm = result.some((slot) => slot.starts_at === `${dateStr}T10:30:00.000Z`);
    expect(hasTenAm).toBe(false);
    expect(hasTenThirtyAm).toBe(false);
    // El bloque anterior (09:30) y posterior (11:00) deben estar disponibles
    const hasNineThirtyAm = result.some((slot) => slot.starts_at === `${dateStr}T09:30:00.000Z`);
    const hasElevenAm = result.some((slot) => slot.starts_at === `${dateStr}T11:00:00.000Z`);
    expect(hasNineThirtyAm).toBe(true);
    expect(hasElevenAm).toBe(true);
  });

  it('should ignore cancelled or non-attended appointments and keep their slots available', () => {
    // Arrange
    const existing = [
      {
        starts_at: `${dateStr}T09:00:00.000Z`,
        duration_minutes: 30,
        status: 'cancelada', // Cancelada
      },
      {
        starts_at: `${dateStr}T14:00:00.000Z`,
        duration_minutes: 30,
        status: 'no_asistio', // No asistió
      },
    ];

    // Act
    const result = getAvailableSlots(dentistId, dateStr, existing);

    // Assert
    // Ninguno de los dos bloqueos debió haber excluido slots
    expect(result.length).toBe(totalExpectedSlots);
    const hasNineAm = result.some((slot) => slot.starts_at === `${dateStr}T09:00:00.000Z`);
    const hasTwoPm = result.some((slot) => slot.starts_at === `${dateStr}T14:00:00.000Z`);
    expect(hasNineAm).toBe(true);
    expect(hasTwoPm).toBe(true);
  });
});
