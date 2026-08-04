import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import ReportsDashboard from '../components/ReportsDashboard';

describe('ReportsDashboard Component', () => {
  const mockOnFetchReport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should render initial empty state without any date selected', () => {
    render(<ReportsDashboard onFetchReport={mockOnFetchReport} />);

    // Verify empty state is displayed
    expect(screen.getByText('Ningún rango seleccionado')).toBeInTheDocument();
    expect(
      screen.getByText(/Por favor, elija las fechas de inicio y fin para cargar los indicadores/i)
    ).toBeInTheDocument();

    // Verify error banner and content are not displayed
    expect(screen.queryByText(/✗/)).not.toBeInTheDocument();
    expect(screen.queryByText('Total Recaudado')).not.toBeInTheDocument();
  });

  it('2. should show error banner when user submits empty dates', async () => {
    render(<ReportsDashboard onFetchReport={mockOnFetchReport} />);

    const generateBtn = screen.getByRole('button', { name: /Generar Reporte/i });
    fireEvent.click(generateBtn);

    expect(screen.getByText('✗ Por favor seleccione ambas fechas.')).toBeInTheDocument();
    expect(mockOnFetchReport).not.toHaveBeenCalled();
  });

  it('3. should display report data correctly on successful generation', async () => {
    const mockReportData = {
      totales: { total_pagado: 500000, total_reversado: 50000, neto: 450000 },
      por_odontologo: [
        { dentist_id: 'dentist-1', dentist_name: 'Dr. Yorman Ceron', total_pagado: 500000, total_reversado: 50000, neto: 450000 },
      ],
      por_tipo_cita: [
        { appointment_reason: 'limpieza', total_pagado: 500000, total_reversado: 50000, neto: 450000 },
      ],
    };

    mockOnFetchReport.mockResolvedValue({
      success: true,
      data: mockReportData,
    });

    render(<ReportsDashboard onFetchReport={mockOnFetchReport} />);

    // Select dates
    const dateFromInput = screen.getByLabelText(/Fecha Desde/i);
    const dateToInput = screen.getByLabelText(/Fecha Hasta/i);

    fireEvent.change(dateFromInput, { target: { value: '2026-07-01' } });
    fireEvent.change(dateToInput, { target: { value: '2026-07-31' } });

    // Click submit
    const generateBtn = screen.getByRole('button', { name: /Generar Reporte/i });
    fireEvent.click(generateBtn);

    // Should call onFetchReport
    await waitFor(() => {
      expect(mockOnFetchReport).toHaveBeenCalled();
    });

    // Check loading indicator shows then hides
    await waitFor(() => {
      expect(screen.queryByText('Cargando datos agregados...')).not.toBeInTheDocument();
    });

    // Check the three section titles are rendered (each is unique in the DOM)
    expect(screen.getByText('Desglose por Odontólogo')).toBeInTheDocument();
    expect(screen.getByText('Desglose por Tipo de Cita')).toBeInTheDocument();

    // Monetary values and column headers repeat across cards and tables —
    // use getAllByText and assert at least one occurrence is present.
    expect(screen.getAllByText(/500\.000,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/50\.000,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/450\.000,00/).length).toBeGreaterThanOrEqual(1);

    // Unique row-level data from each breakdown table
    expect(screen.getByText('Dr. Yorman Ceron')).toBeInTheDocument();
    expect(screen.getByText('limpieza')).toBeInTheDocument();
  });

  it('4. should show error banner when report generation fails', async () => {
    mockOnFetchReport.mockResolvedValue({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden consultar reportes financieros.',
    });

    render(<ReportsDashboard onFetchReport={mockOnFetchReport} />);

    const dateFromInput = screen.getByLabelText(/Fecha Desde/i);
    const dateToInput = screen.getByLabelText(/Fecha Hasta/i);

    fireEvent.change(dateFromInput, { target: { value: '2026-07-01' } });
    fireEvent.change(dateToInput, { target: { value: '2026-07-31' } });

    const generateBtn = screen.getByRole('button', { name: /Generar Reporte/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockOnFetchReport).toHaveBeenCalled();
    });

    // Verify error is displayed
    expect(
      screen.getByText('✗ Acceso denegado. Solo los administradores pueden consultar reportes financieros.')
    ).toBeInTheDocument();

    // The content cards/tables should not render
    expect(screen.queryByText('Total Recaudado')).not.toBeInTheDocument();
  });
});
