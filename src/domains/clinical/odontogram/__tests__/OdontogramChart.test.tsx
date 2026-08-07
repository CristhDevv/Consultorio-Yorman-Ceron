import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import OdontogramChart from '../components/OdontogramChart';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock window.confirm
const confirmSpy = vi.spyOn(window, 'confirm');

describe('OdontogramChart Component', () => {
  const mockOnSelectionSubmit = vi.fn();
  const mockOnDeleteRecord = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    confirmSpy.mockImplementation(() => true);
  });

  it('1. should show default tooth 11 panel with correct anatomical name', () => {
    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    // Default selected tooth is 11
    expect(screen.getByRole('heading', { name: /Incisivo Central Superior Derecho/i })).toBeInTheDocument();
  });

  it('2. allows clicking a tooth to change the selected tooth', () => {
    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    // Click tooth 21
    fireEvent.click(screen.getByText('21'));

    // Heading updates to Incisivo Central Superior Izquierdo
    expect(screen.getByRole('heading', { name: /Incisivo Central Superior Izquierdo/i })).toBeInTheDocument();
  });

  it('3. successful save calls onSelectionSubmit with correct payload', async () => {
    mockOnSelectionSubmit.mockResolvedValue({ success: true });

    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    // Fill face and observation
    fireEvent.change(screen.getByLabelText(/Cara Dental/i), { target: { value: 'Mesial' } });
    fireEvent.change(screen.getByLabelText(/Observación \/ Diagnóstico/i), { target: { value: 'Caries activa' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Guardar Observación/i }));

    await waitFor(() => {
      expect(mockOnSelectionSubmit).toHaveBeenCalledWith({
        tooth_number: 11,
        tooth_face: 'Mesial',
        status: 'Caries activa',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/¡Observación registrada correctamente!/i)).toBeInTheDocument();
    });
  });

  it('4. failed save shows the returned error message', async () => {
    mockOnSelectionSubmit.mockResolvedValue({
      success: false,
      error: 'Error de prueba al guardar.',
    });

    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    fireEvent.change(screen.getByLabelText(/Observación \/ Diagnóstico/i), { target: { value: 'Caries activa' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Observación/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error de prueba al guardar\./i)).toBeInTheDocument();
    });
  });

  it('5. renders observations list and calls onDeleteRecord when clicking delete', async () => {
    mockOnDeleteRecord.mockResolvedValue({ success: true });
    const mockRecords = [
      {
        id: 'rec-1',
        patient_id: 'patient-123',
        tooth_number: 11,
        tooth_face: 'Mesial',
        status: 'Caries dentinaria',
        notes: null,
        created_at: new Date().toISOString(),
      },
    ];

    render(
      <OdontogramChart
        records={mockRecords}
        onSelectionSubmit={mockOnSelectionSubmit}
        onDeleteRecord={mockOnDeleteRecord}
      />
    );

    // Checks that history displays observations
    expect(screen.getByText('Caries dentinaria')).toBeInTheDocument();

    // Click delete
    const deleteButton = screen.getByTitle('Eliminar observación');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockOnDeleteRecord).toHaveBeenCalledWith('rec-1');
    });
  });
});
