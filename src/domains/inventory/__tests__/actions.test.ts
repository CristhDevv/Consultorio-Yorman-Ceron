import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerInventoryMovement, createInventoryProduct } from '../actions';
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
const ADMIN_USER    = { id: 'admin-uuid-001' };
const PRODUCT_ID    = 'product-uuid-aaa';
const PRODUCT_NAME  = 'Guantes de Látex';

const VALID_ENTRADA: Parameters<typeof registerInventoryMovement>[0] = {
  productId: PRODUCT_ID,
  type:      'entrada',
  quantity:  20,
  reason:    'Reposición mensual',
};

const VALID_SALIDA: Parameters<typeof registerInventoryMovement>[0] = {
  productId: PRODUCT_ID,
  type:      'salida',
  quantity:  5,
  reason:    '',
};

// ─── Helpers de mock de cadena .from() ───────────────────────────────────────

/**
 * Configura mockSupabase.from para responder por tabla:
 *  - 'profiles'           → role dado
 *  - 'inventory_products' → product dado (o error)
 */
function setupFrom(
  mockSupabase: MockSupabase,
  {
    role = 'administrador',
    product = { name: PRODUCT_NAME },
    productError = null as null | { message: string },
    profileError = null as null | { message: string },
  } = {}
) {
  mockSupabase.from.mockImplementation((tableName: string) => {
    if (tableName === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: profileError ? null : { role },
                error: profileError,
              }),
          }),
        }),
      };
    }

    if (tableName === 'inventory_products') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: productError ? null : product,
                error: productError,
              }),
          }),
        }),
      };
    }

    return {};
  });
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe('registerInventoryMovement', () => {
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
      data: { user: ADMIN_USER },
      error: null,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Entrada exitosa
  // ───────────────────────────────────────────────────────────────────────────
  it('1. entrada exitosa: llama al RPC con los parámetros correctos y retorna confirmación', async () => {
    // Arrange
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    // Act
    const result = await registerInventoryMovement(VALID_ENTRADA);

    // Assert — éxito con datos de confirmación
    expect(result).toEqual({
      success: true,
      data: {
        productName: PRODUCT_NAME,
        type:        'entrada',
        quantity:    20,
      },
    });

    // Verificar que se invocó el RPC con los argumentos correctos
    expect(mockSupabase.rpc).toHaveBeenCalledOnce();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('register_inventory_movement', {
      p_product_id: PRODUCT_ID,
      p_type:       'entrada',
      p_quantity:   20,
      p_reason:     'Reposición mensual',
      p_user_id:    ADMIN_USER.id,
    });

    // Verificar que se invalidó la ruta del inventario
    expect(revalidatePath).toHaveBeenCalledWith('/inventory');

    // Nunca debe hacer INSERT/UPDATE directo — solo from profiles e inventory_products (lectura)
    const fromCalls = mockSupabase.from.mock.calls.map((c: unknown[]) => c[0]);
    expect(fromCalls).not.toContain('inventory_movements');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Salida exitosa
  // ───────────────────────────────────────────────────────────────────────────
  it('2. salida exitosa: llama al RPC con type=salida y motivo vacío', async () => {
    // Arrange
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    // Act
    const result = await registerInventoryMovement(VALID_SALIDA);

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        productName: PRODUCT_NAME,
        type:        'salida',
        quantity:    5,
      },
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('register_inventory_movement', {
      p_product_id: PRODUCT_ID,
      p_type:       'salida',
      p_quantity:   5,
      p_reason:     '', // motivo vacío → se pasa como string vacío, nunca undefined
      p_user_id:    ADMIN_USER.id,
    });

    expect(revalidatePath).toHaveBeenCalledWith('/inventory');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Salida rechazada por stock insuficiente — mensaje incluye stock disponible
  // ───────────────────────────────────────────────────────────────────────────
  it('3. salida rechazada por stock insuficiente: el resultado incluye availableStock del mensaje del RPC', async () => {
    // Arrange — El RPC devuelve el mensaje exacto de la función PL/pgSQL
    setupFrom(mockSupabase);
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: {
        message:
          'Stock insuficiente para realizar la salida. Disponible: 3, Solicitado: 10.',
      },
    });

    // Act
    const result = await registerInventoryMovement({
      productId: PRODUCT_ID,
      type:      'salida',
      quantity:  10,
      reason:    '',
    });

    // Assert — fallo con el stock disponible extraído del mensaje del RPC
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Stock insuficiente. No se puede realizar la salida.');
      // Verificación explícita: el mensaje SÍ incluye el stock disponible
      expect(result.availableStock).toBe(3);
    }

    // revalidatePath NO debe haberse invocado
    expect(revalidatePath).not.toHaveBeenCalled();

    // El RPC sí fue llamado (la verificación ocurre en el backend)
    expect(mockSupabase.rpc).toHaveBeenCalledOnce();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Rechazo por rol no administrador
  // ───────────────────────────────────────────────────────────────────────────
  it('4. rol no administrador: devuelve error de acceso denegado sin llamar al RPC', async () => {
    // Arrange — perfil con rol odontologo
    setupFrom(mockSupabase, { role: 'odontologo' });

    // Act
    const result = await registerInventoryMovement(VALID_ENTRADA);

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden registrar movimientos de inventario.',
    });

    // El RPC nunca debe haber sido invocado
    expect(mockSupabase.rpc).not.toHaveBeenCalled();

    // revalidatePath tampoco
    expect(revalidatePath).not.toHaveBeenCalled();

    // Solo debe haber consultado profiles (una sola llamada a .from)
    expect(mockSupabase.from).toHaveBeenCalledOnce();
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Sin sesión activa
  // ───────────────────────────────────────────────────────────────────────────
  it('5. sin sesión activa: devuelve error de sesión sin intentar nada más', async () => {
    // Arrange — sin usuario autenticado
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Act
    const result = await registerInventoryMovement(VALID_ENTRADA);

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'No hay sesión activa. Por favor inicia sesión.',
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Producto inexistente
  // ───────────────────────────────────────────────────────────────────────────
  it('6. producto inexistente: devuelve error sin llamar al RPC', async () => {
    // Arrange
    setupFrom(mockSupabase, {
      productError: { message: 'No rows found' },
    });

    // Act
    const result = await registerInventoryMovement(VALID_ENTRADA);

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'El producto seleccionado no existe en el inventario.',
    });

    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('createInventoryProduct', () => {
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
      data: { user: ADMIN_USER },
      error: null,
    });
  });

  it('debe crear un producto exitosamente si el usuario es administrador', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'administrador' },
      error: null,
    });

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingleResponse = vi.fn().mockResolvedValue({
      data: {
        id: 'new-product-uuid',
        name: 'Guantes de Nitrilo',
        unit: 'Cajas',
        min_stock: 5,
        current_stock: 50,
      },
      error: null,
    });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSingle,
            }),
          }),
        };
      }
      if (tableName === 'inventory_products') {
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingleResponse,
        };
      }
      return {};
    });

    const result = await createInventoryProduct({
      name: 'Guantes de Nitrilo',
      unit: 'Cajas',
      minStock: 5,
      currentStock: 50,
    });

    expect(result).toEqual({
      success: true,
      data: {
        id: 'new-product-uuid',
        name: 'Guantes de Nitrilo',
        unit: 'Cajas',
        min_stock: 5,
        current_stock: 50,
      },
    });

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Guantes de Nitrilo',
      unit: 'Cajas',
      min_stock: 5,
      current_stock: 50,
      cost_price: 0,
      created_by: ADMIN_USER.id,
      branch_id: undefined,
    });

    expect(revalidatePath).toHaveBeenCalledWith('/inventory');
  });

  it('debe crear un producto con sucursal exitosamente si el usuario es administrador', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'administrador' },
      error: null,
    });

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingleResponse = vi.fn().mockResolvedValue({
      data: {
        id: 'new-product-uuid',
        name: 'Guantes de Nitrilo',
        unit: 'Cajas',
        min_stock: 5,
        current_stock: 50,
        branch_id: 'branch-uuid',
      },
      error: null,
    });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSingle,
            }),
          }),
        };
      }
      if (tableName === 'inventory_products') {
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingleResponse,
        };
      }
      return {};
    });

    const result = await createInventoryProduct({
      name: 'Guantes de Nitrilo',
      unit: 'Cajas',
      minStock: 5,
      currentStock: 50,
      branchId: 'branch-uuid',
    });

    expect(result).toEqual({
      success: true,
      data: {
        id: 'new-product-uuid',
        name: 'Guantes de Nitrilo',
        unit: 'Cajas',
        min_stock: 5,
        current_stock: 50,
        branch_id: 'branch-uuid',
      },
    });

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Guantes de Nitrilo',
      unit: 'Cajas',
      min_stock: 5,
      current_stock: 50,
      cost_price: 0,
      created_by: ADMIN_USER.id,
      branch_id: 'branch-uuid',
    });

    expect(revalidatePath).toHaveBeenCalledWith('/inventory');
  });

  it('debe fallar si el usuario no es administrador', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'odontologo' },
      error: null,
    });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSingle,
            }),
          }),
        };
      }
      return {};
    });

    const result = await createInventoryProduct({
      name: 'Guantes de Nitrilo',
      unit: 'Cajas',
      minStock: 5,
      currentStock: 50,
    });

    expect(result).toEqual({
      success: false,
      error: 'Acceso denegado. Solo los administradores pueden crear nuevos productos en el inventario.',
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('debe fallar si la sesión no está activa', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await createInventoryProduct({
      name: 'Guantes de Nitrilo',
      unit: 'Cajas',
      minStock: 5,
      currentStock: 50,
    });

    expect(result).toEqual({
      success: false,
      error: 'No hay sesión activa. Por favor inicia sesión.',
    });
  });

  it('debe fallar si las validaciones básicas no se cumplen', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'administrador' },
      error: null,
    });

    mockSupabase.from.mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSingle,
            }),
          }),
        };
      }
      return {};
    });

    const result1 = await createInventoryProduct({
      name: '',
      unit: 'Cajas',
      minStock: 5,
      currentStock: 50,
    });
    expect(result1.success).toBe(false);
    expect(result1.error).toBe('El nombre del producto no puede estar vacío.');

    const result2 = await createInventoryProduct({
      name: 'Test',
      unit: 'Cajas',
      minStock: -1,
      currentStock: 50,
    });
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('El stock mínimo debe ser un número entero mayor o igual a cero.');
  });
});
