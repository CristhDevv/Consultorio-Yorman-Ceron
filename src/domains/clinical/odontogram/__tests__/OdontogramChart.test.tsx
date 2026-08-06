import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import OdontogramChart from '../components/OdontogramChart';

describe('OdontogramChart Component', () => {
  const mockOnSelectionSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should show tooth panel with tooth number and initial empty state when a tooth is clicked', () => {
    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    // Initially shows placeholder
    expect(screen.getByText(/Ninguna pieza seleccionada/i)).toBeInTheDocument();

    // Click tooth 11
    fireEvent.click(screen.getByText('11'));

    // Panel shows with the exact anatomical tooth name (tooth 11 = Incisivo Central Superior Derecho)
    expect(screen.getByRole('heading', { name: /Incisivo Central Superior Derecho/i })).toBeInTheDocument();
    expect(screen.getByText(/Diente #11/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ninguna pieza seleccionada/i)).not.toBeInTheDocument();

    // Default status is 'sano' and notes textarea is empty
    expect(screen.getByDisplayValue('Sano')).toBeInTheDocument();
    const notesTextarea = screen.getByPlaceholderText(/Notas clínicas adicionales/i);
    expect(notesTextarea).toHaveValue('');
  });

  it('2. general status hides face selector and shows whole-tooth message; non-general shows face selector', () => {
    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    fireEvent.click(screen.getByText('11'));

    // 'sano' is a general status — face selector hidden, whole-tooth message visible
    expect(
      screen.getByText(/El diagnóstico seleccionado aplica a toda la pieza completa/i)
    ).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(1);

    // Change to 'caries' — a non-general status
    fireEvent.change(screen.getByDisplayValue('Sano'), { target: { value: 'caries' } });

    // Face selector now visible, whole-tooth message hidden
    expect(
      screen.queryByText(/El diagnóstico seleccionado aplica a toda la pieza completa/i)
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByDisplayValue('Oclusal')).toBeInTheDocument();
  });

  it('3. successful confirm calls onSelectionSubmit with correct payload (tooth_face null for general), shows success message and closes panel', async () => {
    mockOnSelectionSubmit.mockResolvedValue({ success: true });

    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    // Click tooth 21, keep default status 'sano' (general → tooth_face: null)
    fireEvent.click(screen.getByText('21'));

    fireEvent.click(screen.getByRole('button', { name: /Confirmar y Guardar/i }));

    await waitFor(() => {
      expect(mockOnSelectionSubmit).toHaveBeenCalledWith({
        tooth_number: 21,
        tooth_face: null,
        status: 'sano',
        notes: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/¡Registro guardado correctamente!/i)).toBeInTheDocument();
    });

    // Panel closes — tooth deselected; the anatomical name heading should be gone
    expect(screen.queryByRole('heading', { name: /Incisivo Central Superior Izquierdo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Ninguna pieza seleccionada/i)).toBeInTheDocument();
  });

  it('4. failed confirm shows the returned error message and keeps the tooth selected', async () => {
    mockOnSelectionSubmit.mockResolvedValue({
      success: false,
      error: 'Error de prueba al guardar el registro.',
    });

    render(<OdontogramChart onSelectionSubmit={mockOnSelectionSubmit} />);

    fireEvent.click(screen.getByText('11'));

    fireEvent.click(screen.getByRole('button', { name: /Confirmar y Guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error de prueba al guardar el registro\./i)).toBeInTheDocument();
    });

    // Tooth remains selected — panel still visible with anatomical name
    expect(screen.getByRole('heading', { name: /Incisivo Central Superior Derecho/i })).toBeInTheDocument();
    expect(screen.getByText(/Diente #11/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ninguna pieza seleccionada/i)).not.toBeInTheDocument();
  });
});
