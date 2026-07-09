import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import proxy from '../proxy';

// Mock @supabase/ssr — proxy.ts calls createServerClient directly,
// not through the shared wrapper at @/shared/lib/supabase/server.
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

// Mock next/server — NextResponse.next() and NextResponse.redirect()
// are the two exit paths exercised by proxy.ts.
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(),
    redirect: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helper: constructs a minimal NextRequest-shaped object for a given pathname.
// The real NextRequest is a Web-standard Request with Next.js extensions;
// proxy.ts only reads nextUrl.pathname, nextUrl.clone(), and cookies.getAll().
// ---------------------------------------------------------------------------
function createMockRequest(pathname: string): NextRequest {
  // Each call gets its own clonedUrl so that mutations in one test
  // (url.pathname = "/login") do not leak into other tests.
  const clonedUrl = { pathname };
  return {
    nextUrl: {
      pathname,
      clone: () => clonedUrl,
    },
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  } as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Shared mock objects
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();

// The object returned by NextResponse.next() — represents the supabaseResponse
// that proxy.ts passes through when no redirect is needed.
const mockSupabaseResponse = { cookies: { set: vi.fn() } };

describe('proxy middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // createServerClient returns a Supabase-shaped client with auth.getUser
    // Cast seguro: el mock es un stub mínimo con solo auth.getUser, que es lo
    // único que proxy.ts consume de este cliente. No es posible construir un
    // SupabaseClient completo en un contexto de test, por lo que unknown as X
    // es la única vía honesta (mismo patrón aprobado en los demás test files).
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: mockGetUser },
    } as unknown as ReturnType<typeof createServerClient>);

    // NextResponse.next() returns the mock pass-through response
    // Cast seguro: mockSupabaseResponse es un stub mínimo (solo cookies.set),
    // suficiente para que proxy.ts pueda mutarlo y retornarlo sin errores.
    vi.mocked(NextResponse.next).mockReturnValue(mockSupabaseResponse as unknown as NextResponse);

    // NextResponse.redirect() returns a distinct sentinel so we can assert
    // which return path was taken when needed.
    // Cast seguro: { redirected: true } es un sentinel de identidad para aserciones
    // de igualdad referencial; NextResponse hereda la propiedad redirected de Response.
    vi.mocked(NextResponse.redirect).mockReturnValue({ redirected: true } as unknown as NextResponse);
  });

  // -------------------------------------------------------------------------
  // Case A — No session + protected route → redirect to /login
  // -------------------------------------------------------------------------
  it('should redirect to /login when there is no session and the route is protected (/patients)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = createMockRequest('/patients');

    // Act
    await proxy(request);

    // Assert — redirect was called once, and the target pathname is /login
    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectTarget = vi.mocked(NextResponse.redirect).mock.calls[0][0] as { pathname: string };
    expect(redirectTarget.pathname).toBe('/login');
  });

  // -------------------------------------------------------------------------
  // Case B — Active session + auth route → redirect to /
  // -------------------------------------------------------------------------
  it('should redirect to / when there is an active session and the route is an auth route (/login)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const request = createMockRequest('/login');

    // Act
    await proxy(request);

    // Assert — redirect was called once, and the target pathname is /
    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectTarget = vi.mocked(NextResponse.redirect).mock.calls[0][0] as { pathname: string };
    expect(redirectTarget.pathname).toBe('/');
  });

  // -------------------------------------------------------------------------
  // Case C — No session + auth route → pass through (no redirect)
  // -------------------------------------------------------------------------
  it('should pass through when there is no session and the route is an auth route (/login)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = createMockRequest('/login');

    // Act
    const result = await proxy(request);

    // Assert — no redirect, supabaseResponse returned as-is
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBe(mockSupabaseResponse);
  });

  // -------------------------------------------------------------------------
  // Case D — Active session + protected route → pass through (no redirect)
  // -------------------------------------------------------------------------
  it('should pass through when there is an active session and the route is protected (/patients)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const request = createMockRequest('/patients');

    // Act
    const result = await proxy(request);

    // Assert — no redirect, supabaseResponse returned as-is
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBe(mockSupabaseResponse);
  });

  // -------------------------------------------------------------------------
  // Case E — Neutral routes → pass through regardless of session state
  //
  // Note: /appointments is deliberately included here because proxy.ts does NOT
  // list it in isProtectedRoute. This test documents that fact: a request to
  // /appointments without a session passes through the middleware without
  // redirection. This is a known gap reported separately to the project owner;
  // proxy.ts is not modified here.
  // -------------------------------------------------------------------------
  it('should pass through for a neutral route (/) without a session', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = createMockRequest('/');

    // Act
    const result = await proxy(request);

    // Assert
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBe(mockSupabaseResponse);
  });

  it('should pass through for a neutral route (/) with an active session', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const request = createMockRequest('/');

    // Act
    const result = await proxy(request);

    // Assert
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBe(mockSupabaseResponse);
  });

  it('should redirect to /login for /appointments without a session — /appointments is now protected', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = createMockRequest('/appointments');

    // Act
    await proxy(request);

    // Assert — redirect must be called and target /login
    expect(NextResponse.redirect).toHaveBeenCalledOnce();
    const redirectTarget = vi.mocked(NextResponse.redirect).mock.calls[0][0] as { pathname: string };
    expect(redirectTarget.pathname).toBe('/login');
  });
});
