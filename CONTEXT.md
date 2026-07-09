Contexto Completo del Proyecto
Consultorio Odontológico Yorman Cerón

Stack Tecnológico

Framework: Next.js 16.2.10 (App Router, Turbopack)
Lenguaje: TypeScript
Estilos: Tailwind CSS v4 + shadcn/ui
Backend / DB: Supabase (PostgreSQL, Auth, Storage)
Cliente Supabase: @supabase/ssr — cliente browser y server separados
Middleware: src/proxy.ts (nombre requerido por Next.js 16, no middleware.ts)
ORM: Ninguno — llamadas directas con el cliente tipado de Supabase
Testing: Vitest + Testing Library + jsdom, convención estricta de carpeta tests forzada vía include en vitest.config.ts
CI: GitHub Actions (.github/workflows/ci.yml), ejecuta lint, test y build en cada push y pull request
Node: >= 22, fijado vía .nvmrc y engines en package.json
Breaking changes de Next.js 16: middleware se llama proxy.ts con función exportada proxy; params dinámicos son Promise y deben resolverse con await params; grupos de rutas (nombre) no generan segmento de URL.

Proyecto Supabase

Organización: Yorman's Dev
Project ID: crxqqdyvwlqxcidhqalu
Región: us-east-1 (N. Virginia)
URL y Anon Key definidas en .env.local (también configuradas como GitHub Secrets para CI: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

Base de Datos — Esquema Completo

public.profiles: id (uuid, FK auth.users.id), full_name, phone, avatar_url, role (default paciente; valores paciente/odontologo/administrador), created_at, updated_at. Creada automáticamente por trigger al registrarse un usuario.
public.patients: id (uuid PK), full_name (NOT NULL), document_id (UNIQUE NOT NULL), birth_date (NOT NULL), phone, email, address, allergies, diseases, current_medications, medical_observations, created_by (FK auth.users.id), created_at, updated_at.
public.odontogram_records: id (uuid PK), patient_id (FK patients.id), tooth_number, tooth_face, status, notes, created_by (FK auth.users.id), created_at.
  * Restricción odontogram_records_status_check: status limitado exactamente a 'sano', 'caries', 'obturado', 'sellante', 'corona', 'endodoncia', 'implante', 'ausente', 'extraccion_indicada', 'fracturado'.
  * Restricción odontogram_records_status_face_consistency_check: exige tooth_face NULL para estados generales de pieza completa ('sano', 'ausente', 'extraccion_indicada', 'endodoncia', 'corona', 'implante') y NOT NULL para estados localizados en superficies ('caries', 'obturado', 'sellante', 'fracturado'). Esta restricción es funcional en la práctica desde que la migración 20260709_odontogram_tooth_face_drop_not_null eliminó el NOT NULL de tooth_face que la contradecía; antes de esa migración, insertar cualquiera de los 6 estados generales fallaba siempre.
  * Columna tooth_face: Valores reales y exactos verificados en producción: 'Oclusal', 'Mesial', 'Distal', 'Vestibular', 'Palatina', 'Lingual', 'General' (capitalizados).
  * Nota de migración histórica: Las migraciones 20260708_odontogram_records_baseline_and_checks.sql y 20260708_alter_odontogram_records_constraints.sql no fueron aplicadas en producción y contienen valores obsoletos o sintaxis inválida, por lo que no deben usarse como referencia. La base de datos se rige por la migración del 20260709.
public.patient_documents: id (uuid PK), patient_id (FK patients.id), file_name (NOT NULL), file_path, bucket_id (default patient-documents), document_type (NOT NULL), uploaded_by (FK auth.users.id), created_at.
public.appointments: id (uuid PK), patient_id (FK patients.id), dentist_id (uuid, doble FK: apuntando tanto a auth.users.id como a public.profiles.id — coexistencia habilitada para permitir joins nativos de PostgREST hacia profiles, ya que auth.users no está expuesto en el esquema público de la API), starts_at (timestamptz NOT NULL), duration_minutes (integer NOT NULL, default 30), status (text NOT NULL, default programada; check constraint: programada/confirmada/completada/cancelada/no_asistio), reason (text, nullable), notes (text, nullable), created_by (FK auth.users.id), created_at, updated_at.
Restricción de exclusión appointments_no_overlap: implementada con EXCLUDE USING gist sobre la extensión btree_gist, previniendo dos citas del mismo dentist_id cuyo rango de tiempo (calculado vía función IMMUTABLE auxiliar public.appointment_range(starts_at, duration_minutes)) se solape. Excluye explícitamente citas con status cancelada o no_asistio, que no bloquean el horario.

Seguridad — RLS y Funciones

Funciones SECURITY DEFINER: public.is_admin() y public.is_odontologo(), consultan profiles en tiempo real (no el JWT) para evitar recursividad infinita en políticas RLS y reflejar cambios de rol inmediatamente.
RLS profiles: users_read_own_profile (SELECT propio), users_update_own_profile (UPDATE propio, sin poder cambiar role), admin_read_all_profiles (SELECT vía is_admin()). Trigger tr_protect_profile_role bloquea UPDATE en columna role para no-administradores.
RLS patients: SELECT/UPDATE → is_admin() OR is_odontologo(); INSERT → is_admin() OR is_odontologo() con WITH CHECK created_by = auth.uid(); DELETE → solo is_admin().
RLS odontogram_records y patient_documents: mismas reglas que patients, con WITH CHECK adicional validando created_by/uploaded_by = auth.uid().
RLS appointments (validada política por política vía pg_policies): appointments_select (SELECT, USING is_admin() OR is_odontologo()), appointments_insert (INSERT, WITH CHECK (is_admin() OR is_odontologo()) AND created_by = auth.uid()), appointments_update (UPDATE, USING is_admin() OR is_odontologo()), appointments_delete (DELETE, USING is_admin()).
* Corregido, 2026-07-09: /appointments no estaba en isProtectedRoute de src/proxy.ts, lo que permitía acceso al listado y formularios de citas sin una sesión activa. Corregido agregando la ruta a isProtectedRoute. El archivo de test del middleware fue actualizado para reflejar este nuevo comportamiento restrictivo.

Estructura de Archivos

src/proxy.ts — Middleware de auth
src/app/layout.tsx, page.tsx, globals.css
src/app/(auth)/login, register
src/app/(dashboard)/layout.tsx (navbar + verificación de rol server-side)
src/app/(dashboard)/page.tsx
src/app/(dashboard)/patients/ (page, new, [id], [id]/edit)
src/app/(dashboard)/appointments/ (page — listado en tabla; new/page.tsx — creación con flujo progresivo; [id]/page.tsx — detalle con cambio de estado; [id]/edit/page.tsx — edición completa restringida a estados programada/confirmada)
src/app/portal/page.tsx
src/app/api/auth/logout/route.ts
src/domains/patients/ (actions.ts, components: PatientForm, PatientTable, PatientDetailCard, tests/actions.test.ts)
src/domains/appointments/ (actions.ts, config.ts — configuración provisional de horario laboral y duración de bloque, availability.ts — cálculo de slots disponibles con soporte de exclusión de cita propia para edición, components: AppointmentsTable, AppointmentForm, AppointmentEditForm, AppointmentStatusControl, tests: actions.test.ts, availability.test.ts, AppointmentForm.test.tsx)
src/domains/clinical, communications, finance, imaging, inventory, portal, reports — vacíos, pendientes
src/shared/components/ui/ — shadcn/ui
src/shared/lib/supabase/client.ts, server.ts
src/shared/lib/utils.ts
src/shared/hooks/ — vacío
src/shared/types/database.types.ts
.github/workflows/ci.yml
vitest.config.ts
.nvmrc

Rutas URL Actuales

/ (autenticado staff), /login, /register (público)
/patients, /patients/new, /patients/[id], /patients/[id]/edit (odontologo/administrador)
/appointments (listado), /appointments/new (creación con flujo progresivo), /appointments/[id] (detalle + cambio de estado), /appointments/[id]/edit (edición completa, solo si status es programada o confirmada; bloqueada en otros estados) (odontologo/administrador)
/portal (paciente)
/api/auth/logout (POST)
Reglas de protección (proxy.ts): sin sesión + ruta protegida → redirige a /login; con sesión + /login o /register → redirige a /. El layout de (dashboard) verifica rol server-side: si role === 'paciente' → redirige a /portal.

Sistema de Roles

paciente: solo /portal. odontologo: dashboard completo, CRUD de pacientes y citas. administrador: dashboard completo, CRUD + DELETE, lectura de todos los perfiles. Rol siempre leído desde profiles en tiempo real, nunca desde JWT.

Patrones Establecidos

Server Actions para toda escritura, nunca API REST. SSR puro sin useEffect + fetch client-side. Buscador local reactivo sin re-fetch. Error 23505 (unique_violation) interceptado con mensaje amigable (cédula duplicada en patients). Error 23P01 (exclusion_violation) interceptado con mensaje amigable (solapamiento de horario en appointments), tratado explícitamente por código, nunca por texto del mensaje. created_by siempre asignado server-side desde auth.getUser(), nunca desde el payload del formulario. revalidatePath invocado en el servidor tras mutaciones, nunca duplicado en el cliente. Convención de testing: archivos de prueba únicamente dentro de carpetas tests (doble guion bajo), forzado estructuralmente por Vitest. Disponibilidad de horarios centralizada en config.ts and availability.ts, reutilizada tanto en creación como en edición, con exclusión explícita de la propia cita al reprogramar para evitar falso positivo de solapamiento contra sí misma.

Estado de Módulos

Autenticación (login/registro/roles): Completo y seguro.
CRUD de Pacientes (ficha básica): Completo — build y lint OK.
Citas y Agenda: Completo. Incluye restricción de exclusión anti-solapamiento vía btree_gist, doble FK dentist_id hacia auth.users y profiles, RLS completa con 4 políticas validadas explícitamente, disponibilidad de horarios con configuración provisional en src/domains/appointments/config.ts (BUSINESS_DAYS, BUSINESS_START_HOUR, BUSINESS_END_HOUR, SLOT_DURATION_MINUTES) pendiente de definición final de negocio sobre horario laboral real y duración de bloque, listado en tabla con buscador local, creación con flujo progresivo (paciente → odontólogo → fecha → horario calculado → motivo/notas opcionales), vista de detalle con cambio rápido de estado, edición completa de fecha/hora/odontólogo restringida a citas en estado programada o confirmada, y 22 pruebas automatizadas cubriendo Server Actions, disponibilidad y el formulario de creación.
Odontograma Visual: Componente visual OdontogramChart.tsx completo y aceptado, con 32 dientes FDI, panel de selección, múltiples estados simultáneos por diente, y prioridad fija extraccion_indicada sobre ausente para el indicador visual de cruz. Base de datos con constraint de consistencia funcional. Pendiente: integración del componente con actions.ts, sin iniciar.
Documentos del Paciente (Storage): Pendiente — bloqueado hasta crear al menos un bucket en Supabase Storage (confirmado vacío en diagnóstico).
Citas / Agenda: ver arriba, Completo.
Inventario: Pendiente.
Finanzas: Pendiente.
Reportes: Pendiente.
Portal del Paciente: Básico (placeholder), sin cambios.

Validaciones de Build

npm run build → EXIT_CODE: 0
npm run lint → 0 errores, 0 advertencias
npm run test → Vitest, 38 pruebas pasando en 7 archivos (environment, patients/actions, appointments/actions, appointments/availability, appointments/AppointmentForm, odontogram/actions, proxy/middleware), convención de carpeta tests forzada estructuralmente vía include en vitest.config.ts
* Cobertura de Tests Agregada: src/domains/clinical/odontogram/actions.ts (9 tests) y src/proxy.ts (7 tests, incluyendo la verificación de la corrección del hueco de seguridad de rutas). Los archivos shared/lib/utils.ts, shared/lib/supabase/client.ts y shared/lib/supabase/server.ts están excluidos de cobertura por decisión del dueño al considerarse de bajo valor esperado. El componente visual OdontogramChart.tsx se encuentra actualmente sin tests asociados (bloque 2 ya planeado).
TypeScript → sin errores de tipos
CI (.github/workflows/ci.yml) → ejecuta en orden npm ci, npm run lint, npm run test, npm run build en cada push y pull request sobre Ubuntu con Node 22, usando secrets de GitHub para NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (deben configurarse manualmente en Settings → Secrets and variables → Actions)
Node local de desarrollo: v24.18.0, cumple engines >= 22

Control de Versiones

* El proyecto cuenta con un historial de control de versiones local completo, organizado en commits lógicos por área (configuración, UI compartida, autenticación, pacientes, citas, base de datos y documentación).
* Actualmente no se encuentra ningún repositorio remoto (git remote) configurado.

Pendientes Registrados — No Urgentes

* Evaluar si se bloquea a nivel de formulario o base de datos la coexistencia de ausente y extraccion_indicada en un mismo registro para el mismo diente (actualmente el constraint de consistencia no lo impide porque ambos estados son generales y usan tooth_face NULL, por lo que podrían coexistir como filas independientes en odontogram_records).
* Dos errores preexistentes de tsc en los mocks de tests de appointments y patients (src/domains/appointments/__tests__/actions.test.ts y src/domains/patients/__tests__/actions.test.ts, línea 32): MockSupabase no es asignable a SupabaseClient<Database> completo. No relacionados con odontograma ni proxy. Sin corregir todavía.
* Tests del componente OdontogramChart.tsx, bloque dos ya planeado, sin iniciar.
