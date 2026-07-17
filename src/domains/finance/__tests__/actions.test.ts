import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerPatientPayment, getPatientPaymentHistory } from '../actions';
import { createClient } from '@/shared/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── Mocks de módulos ─────────────────────────────────────────────────────────
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ─── Tipos del mock ───────────────────────────────────────────────────────────
interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const ADMIN_USER     = { id: 'admin-uuid-001' };
const PATIENT_ID     = 'patient-uuid-aaa';
const PATIENT_NAME   = 'Juan Pérez';
const APPOINTMENT_ID = 'appointment-uuid-bbb';
const APPOINTMENT_DATE = '2026-07-15T10:00:00Z';
const PAYMENT_ID     = 'payment-uuid-ccc';
const ORIGINAL_PAYMENT_ID = 'payment-uuid-original';

const VALID_PAGO: Parameters<typeof registerPatientPayment>[0] = {
  appointmentId:     APPOINTMENT_ID,
  patientId:         PATIENT_ID,
  type:              'pago',
  amount:            150000,
  reason:            'Pago consulta inicial',
  reversedPaymentId: null,
};

const VALID_REVERSO: Parameters<typeof registerPatientPayment>[0] = {
  appointmentId:     APPOINTMENT_ID,
  patientId:         PATIENT_ID,
  type:              'reverso',
  amount:            150000,
  reason:            'Error en el cobro',
  reversedPaymentId: ORIGINAL_PAYMENT_ID,
};

const VALID_PAGO_SIN_REASON: Parameters<typeof registerPatientPayment>[0] = {
  appointmentId:     APPOINTMENT_ID,
  patientId:         PATIENT_ID,
  type:              'pago',
  amount:            80000,
};

// ─── Helper de mock de cadena .from() ─────────────────────────────────────────

/**
 * Configura mockSupabase.from para responder por tabla:
 *  - 'profiles'     → role dado
 *  - 'patients'     → patient dado (o error)
 *  - 'appointments' → appointment dado (o error)
 */
function setupFrom(
  mockSupabase: MockSupabase,
  {
    role             = 'administrador',
    patient          = { full_name: PATIENT_NAME },
    appointment      = { starts_at: APPOINTMENT_DATE },
    patientError     = null as null | { message: string },
    appointmentError = null as null | { message: string },
    profileError     = null as null | { message: string },
  } = {}
) {
  mockSupabase.from.mockImplementation((tableName: string) => {
    if (tableName === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data:  profileError ? null : { role },
                error: profileError,
              }),
          }),
        }),
      };
    }

    if (tableName === 'patients') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data:  patientError ? null : patient,
                error: patientError,
              }),
          }),
        }),
      };
    }

    if (tableName === 'appointments') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data:  appointmentError ? null : appointment,
                error: appointmentError,
              }),
          }),
        }),
      };
    }

    return {};
  });
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe('registerPatientPayment', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
      rpc:  vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    );

    // Por defecto: sesión autenticada como administrador
    mockSupabase.auth.getUser.mockResolvedValue({
      data:  { user: ADMIN_USER },
      error: null,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Pago exitoso
  // ───────────────────────────────────────────────────────────────────────────
  it('1. pago exitoso: llama al RPC con los parámetros correctos y ejecuta revalidatePath en ambas rutas', async () => {
    // Arrange
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({ data: PAYMENT_ID, error: null });

    // Act
    const result = await registerPatientPayment(VALID_PAGO);

    // Assert — éxito con datos de confirmación
    expect(result).toEqual({
      success: true,
      data: {
        paymentId:       PAYMENT_ID,
        patientName:     PATIENT_NAME,
        appointmentDate: APPOINTMENT_DATE,
        type:            'pago',
        amount:          150000,
      },
    });

    // El RPC debe haberse invocado con los argumentos correctos
    expect(mockSupabase.rpc).toHaveBeenCalledOnce();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('register_patient_payment', {
      p_appointment_id:      APPOINTMENT_ID,
      p_patient_id:          PATIENT_ID,
      p_type:                'pago',
      p_amount:              150000,
      p_reason:              'Pago consulta inicial',
      p_reversed_payment_id: undefined, // null → undefined (activa DEFAULT NULL de la RPC)
      p_user_id:             ADMIN_USER.id,
    });

    // revalidatePath debe haberse invocado exactamente en las dos rutas indicadas
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith('/finance');
    expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Pago exitoso sin reason — verifica que undefined se envía al RPC
  // ───────────────────────────────────────────────────────────────────────────
  it('2. pago sin reason: envía undefined para p_reason cuando no se provee motivo', async () => {
    // Arrange
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({ data: PAYMENT_ID, error: null });

    // Act
    const result = await registerPatientPayment(VALID_PAGO_SIN_REASON);

    // Assert
    expect(result.success).toBe(true);

    // Verificar explícitamente que p_reason se envía como undefined (no como string vacío)
    // para activar el DEFAULT NULL de la función SQL
    expect(mockSupabase.rpc).toHaveBeenCalledWith('register_patient_payment', {
      p_appointment_id:      APPOINTMENT_ID,
      p_patient_id:          PATIENT_ID,
      p_type:                'pago',
      p_amount:              80000,
      p_reason:              undefined,
      p_reversed_payment_id: undefined,
      p_user_id:             ADMIN_USER.id,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Reverso exitoso
  // ───────────────────────────────────────────────────────────────────────────
  it('3. reverso exitoso: llama al RPC con type reverso y reversedPaymentId válido', async () => {
    // Arrange
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({ data: PAYMENT_ID, error: null });

    // Act
    const result = await registerPatientPayment(VALID_REVERSO);

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        paymentId:       PAYMENT_ID,
        patientName:     PATIENT_NAME,
        appointmentDate: APPOINTMENT_DATE,
        type:            'reverso',
        amount:          150000,
      },
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('register_patient_payment', {
      p_appointment_id:      APPOINTMENT_ID,
      p_patient_id:          PATIENT_ID,
      p_type:                'reverso',
      p_amount:              150000,
      p_reason:              'Error en el cobro',
      p_reversed_payment_id: ORIGINAL_PAYMENT_ID,
      p_user_id:             ADMIN_USER.id,
    });

    expect(revalidatePath).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith('/finance');
    expect(revalidatePath).toHaveBeenCalledWith(`/patients/${PATIENT_ID}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Rechazo por saldo insuficiente — regex extrae saldo disponible
  // ───────────────────────────────────────────────────────────────────────────
  it('4. saldo insuficiente: el resultado incluye availableBalance extraído por regex del mensaje del RPC', async () => {
    // Arrange — mensaje exacto definido en la función SQL
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({
      data:  null,
      error: {
        message: 'El pago (200000) excede el saldo pendiente de la cita (50000).',
      },
    });

    // Act
    const result = await registerPatientPayment({
      ...VALID_PAGO,
      amount: 200000,
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('El monto del pago excede el saldo pendiente disponible.');
      expect(result.availableBalance).toBe(50000);
    }

    // revalidatePath NO debe haberse invocado en ningún error
    expect(revalidatePath).not.toHaveBeenCalled();
    // El RPC sí fue llamado (el rechazo ocurre en el backend)
    expect(mockSupabase.rpc).toHaveBeenCalledOnce();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Rechazo por reverso cuyo monto excede el pago original
  // ───────────────────────────────────────────────────────────────────────────
  it('5. monto de reverso excede pago original: el resultado incluye originalAmount extraído por regex', async () => {
    // Arrange — mensaje exacto definido en la función SQL
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({
      data:  null,
      error: {
        message: 'El monto del reverso (200000) excede el monto del pago original (150000).',
      },
    });

    // Act
    const result = await registerPatientPayment({
      ...VALID_REVERSO,
      amount: 200000,
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('El monto del reverso excede el valor del pago original.');
      expect(result.originalAmount).toBe(150000);
    }

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(mockSupabase.rpc).toHaveBeenCalledOnce();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Rechazo por intento de reversar un registro que no es de tipo 'pago'
  // ───────────────────────────────────────────────────────────────────────────
  it('6. reverso de un no-pago: devuelve mensaje de error mapeado sin llamar a revalidatePath', async () => {
    // Arrange — mensaje exacto definido en la función SQL
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({
      data:  null,
      error: {
        message: `El registro referenciado (ID ${ORIGINAL_PAYMENT_ID}) no es un pago; no se puede revertir un reverso.`,
      },
    });

    // Act
    const result = await registerPatientPayment(VALID_REVERSO);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        'El registro de pago referenciado no es válido para reverso porque ya es un reverso o tipo inválido.'
      );
    }

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(mockSupabase.rpc).toHaveBeenCalledOnce();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Rechazo por rol no administrador
  // ───────────────────────────────────────────────────────────────────────────
  it('7. rol no administrador: devuelve error de acceso denegado sin llamar al RPC', async () => {
    // Arrange — perfil con rol odontologo
    setupFrom(mockSupabase, { role: 'odontologo' });

    // Act
    const result = await registerPatientPayment(VALID_PAGO);

    // Assert
    expect(result).toEqual({
      success: false,
      error:   'Acceso denegado. Solo los administradores pueden registrar pagos o reversos.',
    });

    // El RPC nunca debe haberse invocado
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();

    // Solo debe haber consultado profiles (una sola llamada a .from)
    expect(mockSupabase.from).toHaveBeenCalledOnce();
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Sin sesión activa
  // ───────────────────────────────────────────────────────────────────────────
  it('8. sin sesión activa: devuelve error de sesión sin intentar nada más', async () => {
    // Arrange — sin usuario autenticado
    mockSupabase.auth.getUser.mockResolvedValue({
      data:  { user: null },
      error: null,
    });

    // Act
    const result = await registerPatientPayment(VALID_PAGO);

    // Assert
    expect(result).toEqual({
      success: false,
      error:   'No hay sesión activa. Por favor inicia sesión.',
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Cita sin monto definido — fallback del mapeo de errores
  // ───────────────────────────────────────────────────────────────────────────
  it('9. cita sin monto definido: el mensaje del RPC no coincide con ningún regex y se devuelve como fallback', async () => {
    // Arrange — mensaje exacto definido en la función SQL para este caso
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({
      data:  null,
      error: {
        message:
          'La cita no tiene monto definido. Establezca appointments.amount antes de registrar pagos.',
      },
    });

    // Act
    const result = await registerPatientPayment(VALID_PAGO);

    // Assert — el mensaje no coincide con ningún regex definido, se devuelve el mensaje original del RPC
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        'La cita no tiene monto definido. Establezca appointments.amount antes de registrar pagos.'
      );
      // Verificar que no se extrajeron datos extra (no aplica ningún regex)
      expect(result.availableBalance).toBeUndefined();
      expect(result.originalAmount).toBeUndefined();
    }

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ─── Suite: getPatientPaymentHistory ──────────────────────────────────────────

// Constantes compartidas del dominio de historial
const PATIENT_ID_HIST = 'patient-uuid-hist-001';
const ADMIN_USER_HIST = { id: 'admin-uuid-hist-001' };
const ODONT_USER_HIST = { id: 'odont-uuid-hist-001' };

const ROW_PAGO = {
  id:                  'pay-uuid-001',
  appointment_id:      'appt-uuid-001',
  patient_id:          PATIENT_ID_HIST,
  type:                'pago',
  amount:              200000,
  reason:              'Pago inicial consulta',
  reversed_payment_id: null,
  created_by:          ADMIN_USER_HIST.id,
  created_at:          '2026-07-10T09:00:00Z',
};

const ROW_REVERSO = {
  id:                  'pay-uuid-002',
  appointment_id:      'appt-uuid-001',
  patient_id:          PATIENT_ID_HIST,
  type:                'reverso',
  amount:              50000,
  reason:              'Ajuste por error',
  reversed_payment_id: 'pay-uuid-001',
  created_by:          ADMIN_USER_HIST.id,
  created_at:          '2026-07-11T10:00:00Z',
};

/**
 * Configura mockSupabase.from para la suite de historial:
 *  - 'profiles'         → devuelve { role } o error
 *  - 'patient_payments' → devuelve rows o error, con cadena .select().eq().order()
 */
function setupFromHistory(
  mockSupabase: MockSupabase,
  {
    role         = 'administrador',
    profileError = null as null | { message: string },
    rows         = [] as object[],
    queryError   = null as null | { message: string },
  } = {}
) {
  mockSupabase.from.mockImplementation((tableName: string) => {
    if (tableName === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data:  profileError ? null : { role },
                error: profileError,
              }),
          }),
        }),
      };
    }

    if (tableName === 'patient_payments') {
      return {
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data:  queryError ? null : rows,
                error: queryError,
              }),
          }),
        }),
      };
    }

    return {};
  });
}

describe('getPatientPaymentHistory', () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
      rpc:  vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>
    );

    // Por defecto: sesión autenticada como administrador
    mockSupabase.auth.getUser.mockResolvedValue({
      data:  { user: ADMIN_USER_HIST },
      error: null,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Lectura exitosa para administrador — verifica movimientos y resumen
  // ───────────────────────────────────────────────────────────────────────────
  it('1. lectura exitosa para administrador: devuelve movimientos ordenados y resumen (totalPagado, totalReversado, saldoNeto) correctamente calculados', async () => {
    // Arrange — un pago de 200 000 y un reverso de 50 000
    setupFromHistory(mockSupabase, {
      role: 'administrador',
      rows: [ROW_PAGO, ROW_REVERSO],
    });

    // Act
    const result = await getPatientPaymentHistory(PATIENT_ID_HIST);

    // Assert — éxito
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Los movimientos se devuelven en el orden en que los retornó la query (ASC)
    expect(result.data.movements).toHaveLength(2);
    expect(result.data.movements[0]).toMatchObject({ id: 'pay-uuid-001', type: 'pago' });
    expect(result.data.movements[1]).toMatchObject({ id: 'pay-uuid-002', type: 'reverso' });

    // Resumen calculado correctamente
    expect(result.data.summary).toEqual({
      totalPagado:    200000,
      totalReversado: 50000,
      saldoNeto:      150000,
    });

    // Esta función no llama a revalidatePath nunca
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Lectura exitosa para odontólogo — mismo resultado, rol diferente
  // ───────────────────────────────────────────────────────────────────────────
  it('2. lectura exitosa para odontólogo: el rol odontologo también tiene acceso de lectura y obtiene el mismo resumen', async () => {
    // Arrange — sesión como odontologo
    mockSupabase.auth.getUser.mockResolvedValue({
      data:  { user: ODONT_USER_HIST },
      error: null,
    });
    setupFromHistory(mockSupabase, {
      role: 'odontologo',
      rows: [ROW_PAGO, ROW_REVERSO],
    });

    // Act
    const result = await getPatientPaymentHistory(PATIENT_ID_HIST);

    // Assert
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.movements).toHaveLength(2);
    expect(result.data.summary).toEqual({
      totalPagado:    200000,
      totalReversado: 50000,
      saldoNeto:      150000,
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Rechazo por rol no autorizado (paciente — defensa en profundidad)
  // ───────────────────────────────────────────────────────────────────────────
  it('3. rol paciente: devuelve acceso denegado sin consultar patient_payments', async () => {
    // Arrange — perfil con rol paciente
    setupFromHistory(mockSupabase, { role: 'paciente' });

    // Act
    const result = await getPatientPaymentHistory(PATIENT_ID_HIST);

    // Assert
    expect(result).toEqual({
      success: false,
      error:   'Acceso denegado. Solo administradores y odontólogos pueden consultar el historial de pagos.',
    });

    // Solo debe haber consultado profiles, no patient_payments
    expect(mockSupabase.from).toHaveBeenCalledOnce();
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Sin sesión activa
  // ───────────────────────────────────────────────────────────────────────────
  it('4. sin sesión activa: devuelve error de sesión sin intentar nada más', async () => {
    // Arrange — sin usuario autenticado
    mockSupabase.auth.getUser.mockResolvedValue({
      data:  { user: null },
      error: null,
    });

    // Act
    const result = await getPatientPaymentHistory(PATIENT_ID_HIST);

    // Assert
    expect(result).toEqual({
      success: false,
      error:   'No hay sesión activa. Por favor inicia sesión.',
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Historial vacío — paciente sin movimientos registrados
  // ───────────────────────────────────────────────────────────────────────────
  it('5. historial vacío: devuelve movements como arreglo vacío y los tres valores del resumen en cero, no un error', async () => {
    // Arrange — query devuelve arreglo vacío
    setupFromHistory(mockSupabase, {
      role: 'administrador',
      rows: [],
    });

    // Act
    const result = await getPatientPaymentHistory(PATIENT_ID_HIST);

    // Assert — éxito con colección vacía
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.movements).toEqual([]);
    expect(result.data.summary).toEqual({
      totalPagado:    0,
      totalReversado: 0,
      saldoNeto:      0,
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Dato corrupto — fila con type fuera de dominio
  // ───────────────────────────────────────────────────────────────────────────
  it('6. dato corrupto: fila con type fuera de pago/reverso dispara success false con mensaje de inconsistencia, sin calcular resumen', async () => {
    // Arrange — una fila válida seguida de una fila con type inválido
    const ROW_CORRUPTO = { ...ROW_PAGO, id: 'pay-uuid-corrupto', type: 'transferencia' };
    setupFromHistory(mockSupabase, {
      role: 'administrador',
      rows: [ROW_PAGO, ROW_CORRUPTO],
    });

    // Act
    const result = await getPatientPaymentHistory(PATIENT_ID_HIST);

    // Assert — la función debe rechazar el historial completo, no calcular un resumen parcial
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toBe(
      "Inconsistencia de datos: se encontró un registro de pago con tipo inválido 'transferencia' para el paciente."
    );

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

