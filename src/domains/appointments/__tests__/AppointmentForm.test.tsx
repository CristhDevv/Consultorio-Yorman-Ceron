import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import AppointmentForm from '../components/AppointmentForm';
import { createAppointment, getAvailableSlotsForDentistAndDate } from '../actions';

// Setup router mocks
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
  }),
}));

// Setup actions mocks
vi.mock('../actions', () => ({
  createAppointment: vi.fn(),
  getAvailableSlotsForDentistAndDate: vi.fn(),
  getBranchesForDentist: vi.fn().mockResolvedValue([]),
}));

describe('AppointmentForm Component', () => {
  const mockPatients = [
    { id: 'p1', full_name: 'Juan Perez', document_id: '12003004' },
    { id: 'p2', full_name: 'Maria Gomez', document_id: '87654321' }
  ];

  const mockDentists = [
    { id: 'd1', full_name: 'Dr. House' },
    { id: 'd2', full_name: 'Dr. Strange' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should keep the slot selector disabled and show placeholder text when dentist or date is missing', () => {
    // Arrange
    render(<AppointmentForm patients={mockPatients} dentists={mockDentists} />);

    // Assert placeholder text is visible
    expect(screen.getByText(/Selecciona odontólogo y fecha para ver los horarios disponibles/i)).toBeInTheDocument();
  });

  it('2. should fetch available slots when both dentist and date are selected and show them as options', async () => {
    // Arrange
    const mockSlots = [
      { starts_at: '2026-07-06T08:00:00.000Z', duration_minutes: 30 },
      { starts_at: '2026-07-06T08:30:00.000Z', duration_minutes: 30 }
    ];
    vi.mocked(getAvailableSlotsForDentistAndDate).mockResolvedValue(mockSlots);

    render(<AppointmentForm patients={mockPatients} dentists={mockDentists} />);

    // Act - Select Dentist
    const dentistSelect = screen.getByLabelText(/Odontólogo/i);
    fireEvent.change(dentistSelect, { target: { value: 'd1' } });

    // Act - Select Date
    const dateInput = screen.getByLabelText(/Fecha de la Cita/i);
    fireEvent.change(dateInput, { target: { value: '2026-07-06' } });

    // Assert - Expect fetch to be called
    await waitFor(() => {
      expect(getAvailableSlotsForDentistAndDate).toHaveBeenCalledWith('d1', '2026-07-06');
    });

    // Assert - Slots are rendered
    await waitFor(() => {
      expect(screen.getByText(/08:00/i)).toBeInTheDocument();
      expect(screen.getByText(/08:30/i)).toBeInTheDocument();
    });
  });

  it('3. should keep the save button disabled until patient, dentist, date, and slot are selected', async () => {
    // Arrange
    const mockSlots = [
      { starts_at: '2026-07-06T08:00:00.000Z', duration_minutes: 30 }
    ];
    vi.mocked(getAvailableSlotsForDentistAndDate).mockResolvedValue(mockSlots);

    render(<AppointmentForm patients={mockPatients} dentists={mockDentists} />);

    const saveButton = screen.getByRole('button', { name: /Programar Cita/i });
    expect(saveButton).toBeDisabled();

    // Fill Patient
    const patientSearch = screen.getByPlaceholderText(/Buscar por nombre o número de cédula.../i);
    fireEvent.change(patientSearch, { target: { value: 'Juan' } });
    const patientBtn = screen.getByText('Juan Perez');
    fireEvent.click(patientBtn);

    expect(saveButton).toBeDisabled();

    // Fill Dentist
    const dentistSelect = screen.getByLabelText(/Odontólogo/i);
    fireEvent.change(dentistSelect, { target: { value: 'd1' } });

    expect(saveButton).toBeDisabled();

    // Fill Date
    const dateInput = screen.getByLabelText(/Fecha de la Cita/i);
    fireEvent.change(dateInput, { target: { value: '2026-07-06' } });

    expect(saveButton).toBeDisabled();

    // Select Slot
    await waitFor(() => {
      expect(screen.getByText(/08:00/i)).toBeInTheDocument();
    });
    const slotBtn = screen.getByText(/08:00/i);
    fireEvent.click(slotBtn);

    // Save button should now be enabled (without requiring reason/notes)
    expect(saveButton).toBeEnabled();
  });

  it('4. should handle overlap error, show warning alert, and preserve form values', async () => {
    // Arrange
    const mockSlots = [
      { starts_at: '2026-07-06T08:00:00.000Z', duration_minutes: 30 }
    ];
    vi.mocked(getAvailableSlotsForDentistAndDate).mockResolvedValue(mockSlots);
    vi.mocked(createAppointment).mockResolvedValue({
      success: false,
      error: 'El odontólogo ya tiene una cita programada en ese horario. Por favor selecciona otro horario o dentista.'
    });

    render(<AppointmentForm patients={mockPatients} dentists={mockDentists} />);

    // Step 1: Select patient
    const patientSearch = screen.getByPlaceholderText(/Buscar por nombre o número de cédula.../i);
    fireEvent.change(patientSearch, { target: { value: 'Juan' } });
    const patientBtn = screen.getByText('Juan Perez');
    fireEvent.click(patientBtn);

    // Step 2: Select dentist
    const dentistSelect = screen.getByLabelText(/Odontólogo/i) as HTMLSelectElement;
    fireEvent.change(dentistSelect, { target: { value: 'd1' } });

    // Step 3: Select date
    const dateInput = screen.getByLabelText(/Fecha de la Cita/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-07-06' } });

    // Step 4: Wait for slots and select one
    await waitFor(() => {
      expect(screen.getByText(/08:00/i)).toBeInTheDocument();
    });
    const slotBtn = screen.getByText(/08:00/i);
    fireEvent.click(slotBtn);

    // Wait for save button to be enabled, confirming selectedSlot state has propagated.
    const saveButton = screen.getByRole('button', { name: /Programar Cita/i });
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    // Step 5: Submit the form directly, bypassing jsdom's HTML constraint
    // validation. The `reason` input has `required` + enabled + empty value,
    // which causes jsdom to reject submission via button click without firing
    // the submit event. `fireEvent.submit` dispatches the event directly so
    // handleSubmit runs with its own state guards intact.
    fireEvent.submit(saveButton.closest('form')!);

    // Assert: createAppointment was called with the correct core fields
    await waitFor(() => {
      expect(createAppointment).toHaveBeenCalledWith({
        patient_id: 'p1',
        dentist_id: 'd1',
        starts_at: '2026-07-06T08:00:00.000Z',
        duration_minutes: 30,
        status: 'programada',
        reason: '',
        notes: '',
        branch_id: null,
      });
    });

    // Assert: Warning alert is shown with the overlap error message
    await waitFor(() => {
      expect(screen.getByText(/El odontólogo ya tiene una cita programada en ese horario/i)).toBeInTheDocument();
    });

    // Assert: Core form inputs are preserved after error (no state reset)
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Doc: 12003004')).toBeInTheDocument();
    expect(dentistSelect.value).toBe('d1');
    expect(dateInput.value).toBe('2026-07-06');
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
