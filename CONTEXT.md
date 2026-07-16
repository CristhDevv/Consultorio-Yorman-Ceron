Contexto Completo del Proyecto Consultorio Odontológico Yorman Cerón
Stack Tecnológico
Framework: Next.js 16.2.10 (App Router, Turbopack) Lenguaje: TypeScript Estilos: Tailwind CSS v4 + shadcn/ui Backend / DB: Supabase (PostgreSQL, Auth, Storage) Cliente Supabase: @supabase/ssr — cliente browser y server separados Middleware: src/proxy.ts (nombre requerido por Next.js 16, no middleware.ts) ORM: Ninguno — llamadas directas con el cliente tipado de Supabase Testing: Vitest + Testing Library + jsdom, convención estricta de carpeta __tests__ forzada vía include en vitest.config.ts CI: GitHub Actions (.github/workflows/ci.yml), ejecuta lint, test y build en cada push y pull request Node: >= 22, fijado vía .nvmrc y engines en package.json Breaking changes de Next.js 16: middleware se llama proxy.ts con función exportada proxy; params dinámicos son Promise y deben resolverse con await params; grupos de rutas (nombre) no generan segmento de URL.
Decisiones de Producto Vigentes
No existe portal funcional para pacientes. El sistema es de uso exclusivo administrativo (odontólogo/administrador). La ruta /portal se mantiene únicamente como pantalla de "Acceso restringido" que informa al usuario con rol paciente que el sistema no está disponible para su rol, y le permite cerrar sesión. No hay ningún plan de construir funcionalidad de paciente sobre esa ruta.
Horario laboral de citas: sin restricción de día ni hora. Se puede agendar cualquier día de la semana (incluido domingo) a cualquier hora. BUSINESS_START_HOUR y BUSINESS_END_HOUR en config.ts quedan en 0 y 24 respectivamente por compatibilidad con las fórmulas existentes en availability.ts y su test; ya no representan una restricción real de negocio.
Tipos de cita y duración: catálogo fijo en APPOINTMENT_DURATIONS (config.ts) — primera_consulta 60 min, control 30 min, limpieza 45 min, urgencia 30 min. Soporta override manual explícito de duración vía getAppointmentDuration(type, manualOverrideMinutes).
Buffer entre citas: 10 minutos (BUFFER_TIME_MINUTES) aplicado siempre sobre la duración final ya resuelta (incluyendo override manual) de la cita existente que genera el bloqueo, nunca sobre la cita candidata. Excepción: citas tipo urgencia tienen buffer 0 sin importar override manual de duración (getBufferTimeForType).
Documentos de paciente: solo staff (odontólogo/administrador) sube documentos en nombre del paciente. Cualquier tipo de archivo está permitido excepto ejecutables/scripts (blocklist explícita por extensión y mimetype, no allowlist). Límite de 5 MB por archivo, aplicado tanto en la Server Action como en el bucket de Storage.
Proyecto Supabase
Organización: Yorman's Dev Project ID: crxqqdyvwlqxcidhqalu Región: us-east-1 (N. Virginia) URL y Anon Key definidas en .env.local (también configuradas como GitHub Secrets para CI: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
Base de Datos — Esquema Completo
public.profiles: id (uuid, FK auth.users.id), full_name, phone, avatar_url, role (default paciente; valores paciente/odontologo/administrador), created_at, updated_at. Creada automáticamente por trigger al registrarse un usuario.
public.patients: id (uuid PK), full_name (NOT NULL), document_id (UNIQUE NOT NULL), birth_date (NOT NULL), phone, email, address, allergies, diseases, current_medications, medical_observations, created_by (FK auth.users.id), created_at, updated_at.
public.odontogram_records: id (uuid PK), patient_id (FK patients.id), tooth_number, tooth_face, status, notes, created_by (FK auth.users.id), created_at.
Restricción odontogram_records_status_check: status limitado exactamente a 'sano', 'caries', 'obturado', 'sellante', 'corona', 'endodoncia', 'implante', 'ausente', 'extraccion_indicada', 'fracturado'.
Restricción odontogram_records_status_face_consistency_check: exige tooth_face NULL para estados generales de pieza completa ('sano', 'ausente', 'extraccion_indicada', 'endodoncia', 'corona', 'implante') y NOT NULL para estados localizados en superficies ('caries', 'obturado', 'sellante', 'fracturado').
Restricción de coexistencia de pieza completa: índice único parcial compuesto unique_patient_tooth_absent_extraccion_idx (migración 20260709_odontogram_unique_absent_extraccion.sql) que restringe a un máximo de una fila por combinación de patient_id y tooth_number para los estados ausente y extraccion_indicada, impidiendo tanto su coexistencia como su duplicación.
Columna tooth_face: valores reales verificados en producción: 'Oclusal', 'Mesial', 'Distal', 'Vestibular', 'Palatina', 'Lingual', 'General' (capitalizados).
Server Action createOdontogramRecord captura el error 23505 (violación del índice único) y lo traduce a un mensaje amigable.
Nota de migración histórica: las migraciones 20260708_odontogram_records_baseline_and_checks.sql y 20260708_alter_odontogram_records_constraints.sql no fueron aplicadas en producción y no deben usarse como referencia. La base de datos se rige por las migraciones del 20260709.
public.patient_documents: id (uuid PK), patient_id (FK patients.id), document_type (text, NOT NULL, texto libre sin catálogo), bucket_id (text, NOT NULL, default 'patient-attachments'), file_path (text, NOT NULL), file_name (text, NOT NULL), uploaded_by (FK auth.users.id, NOT NULL), created_at (timestamptz, NOT NULL, default now()). Todas las columnas son NOT NULL, confirmado contra producción. Documentada en migración baseline 20260709233600_create_patient_documents_baseline.sql (CREATE TABLE IF NOT EXISTS, la tabla ya existía en producción sin migración previa que la respaldara). RLS documentada retroactivamente en 20260709233900_patient_documents_rls_baseline.sql.
public.appointments: id (uuid PK), patient_id (FK patients.id), dentist_id (uuid, doble FK hacia auth.users.id y public.profiles.id — coexistencia intencional para permitir joins nativos de PostgREST hacia profiles), starts_at (timestamptz NOT NULL), duration_minutes (integer NOT NULL, default 30), status (text NOT NULL, default programada; check constraint: programada/confirmada/completada/cancelada/no_asistio), reason (text, nullable), notes (text, nullable), created_by (FK auth.users.id), created_at, updated_at.
Restricción de exclusión appointments_no_overlap: EXCLUDE USING gist sobre btree_gist, previniendo dos citas del mismo dentist_id cuyo rango se solape (función IMMUTABLE public.appointment_range(starts_at, duration_minutes)). Excluye citas canceladas o no_asistio.
Lógica de disponibilidad (availability.ts) extendida: la duración real del slot generado y evaluado ya no es un valor fijo, se calcula con getAppointmentDuration(type, manualOverride); el bloqueo contra cada cita existente activa se extiende hasta su fin más su propio buffer (getBufferTimeForType del tipo de esa cita existente, no del tipo de la cita candidata), sin extender el bloqueo hacia atrás.
public.inventory_products: id (uuid PK), name, unit, min_stock (>= 0), current_stock (>= 0), created_by (FK auth.users.id), created_at, updated_at.
public.inventory_movements: id (uuid PK), product_id (FK inventory_products.id), type ('entrada' / 'salida'), quantity (> 0), reason, created_by (FK auth.users.id), created_at.
Storage — Supabase Storage
Bucket patient-attachments: privado (public: false), file_size_limit 5242880 bytes (5 MB), allowed_mime_types null por diseño (la restricción de tipo de archivo es un blocklist de ejecutables aplicado en la Server Action, no un allowlist a nivel de bucket). Creado y configurado vía migraciones 20260709233700_create_storage_patient_attachments.sql and 20260709233800_set_patient_attachments_size_limit.sql.
Políticas RLS de storage.objects sobre este bucket: SELECT e INSERT restringidas a authenticated con (is_admin() OR is_odontologo()).
Seguridad — RLS y Funciones
Funciones SECURITY DEFINER: public.is_admin() y public.is_odontologo(), consultan profiles en tiempo real (no el JWT) para evitar recursividad infinita en políticas RLS y reflejar cambios de rol inmediatamente.
RLS profiles: users_read_own_profile (SELECT propio), users_update_own_profile (UPDATE propio, sin poder cambiar role), admin_read_all_profiles (SELECT vía is_admin()). Trigger tr_protect_profile_role bloquea UPDATE en columna role para no-administradores.
RLS patients: SELECT/UPDATE → is_admin() OR is_odontologo(); INSERT → is_admin() OR is_odontologo() con WITH CHECK created_by = auth.uid(); DELETE → solo is_admin().
RLS odontogram_records: mismas reglas que patients, con WITH CHECK adicional validando created_by = auth.uid().
RLS patient_documents (verificada contra producción y documentada retroactivamente): read_documents (SELECT, USING is_admin() OR is_odontologo()), insert_documents (INSERT, WITH CHECK (is_admin() OR is_odontologo()) AND uploaded_by = auth.uid()), update_documents (UPDATE, USING is_admin() OR is_odontologo()), delete_documents (DELETE, USING is_admin()).
RLS appointments: appointments_select (SELECT, USING is_admin() OR is_odontologo()), appointments_insert (INSERT, WITH CHECK (is_admin() OR is_odontologo()) AND created_by = auth.uid()), appointments_update (UPDATE, USING is_admin() OR is_odontologo()), appointments_delete (DELETE, USING is_admin()).
RLS inventory_products: SELECT → is_admin() OR is_odontologo(); INSERT/UPDATE/DELETE (alta/edición de catálogo) → solo is_admin().
RLS inventory_movements: SELECT → is_admin() OR is_odontologo(); INSERT → solo is_admin() con WITH CHECK created_by = auth.uid(). UPDATE y DELETE no permitidos (append-only).
Función SECURITY DEFINER: public.register_inventory_movement(p_product_id, p_type, p_quantity, p_reason, p_user_id) con control interno de acceso (is_admin()) y restricciones de ejecución REVOKE de PUBLIC y GRANT a authenticated.
Corregido, 2026-07-09: /appointments no estaba en isProtectedRoute de src/proxy.ts, lo que permitía acceso sin sesión activa. Corregido agregando la ruta a isProtectedRoute, con test de cobertura actualizado.
Estructura de Archivos
src/proxy.ts — Middleware de auth
src/app/layout.tsx, page.tsx, globals.css
src/app/(auth)/login, register
src/app/(dashboard)/layout.tsx (navbar con enlace a /inventory condicionado a administrador + verificación de rol server-side)
src/app/(dashboard)/page.tsx
src/app/(dashboard)/patients/ (page, new, [id] — incluye odontograma y documentos integrados, [id]/edit)
src/app/(dashboard)/appointments/ (page, new, [id], [id]/edit)
src/app/portal/page.tsx — pantalla de acceso restringido, no portal funcional
src/app/api/auth/logout/route.ts
src/domains/patients/ (actions.ts, components: PatientForm, PatientTable, PatientDetailCard, __tests__/actions.test.ts)
src/domains/patients/documents/ (actions.ts — uploadPatientDocument, getPatientDocuments, getDocumentSignedUrl, deletePatientDocument; components/PatientDocuments.tsx)
src/domains/appointments/ (actions.ts, config.ts, availability.ts, components: AppointmentsTable, AppointmentForm, AppointmentEditForm, AppointmentStatusControl, __tests__: actions.test.ts, availability.test.ts, AppointmentForm.test.tsx)
src/domains/clinical/odontogram/ (actions.ts, components/OdontogramChart.tsx, __tests__: actions.test.ts, OdontogramChart.test.tsx)
src/domains/inventory/ (actions.ts — getInventoryProducts; __tests__/page.test.tsx vía src/app/(dashboard)/inventory/__tests__/)
src/app/(dashboard)/inventory/ (page.tsx — catálogo de productos, solo administrador)
src/domains/communications, finance, imaging, reports — vacíos, pendientes
src/shared/components/ui/ — shadcn/ui
src/shared/lib/supabase/client.ts, server.ts
src/shared/lib/utils.ts
src/shared/types/database.types.ts
.github/workflows/ci.yml
vitest.config.ts
.nvmrc
Rutas URL Actuales
/ (autenticado staff), /login, /register (público)
/patients, /patients/new, /patients/[id] (incluye odontograma y documentos), /patients/[id]/edit (odontologo/administrador)
/appointments, /appointments/new, /appointments/[id], /appointments/[id]/edit (odontologo/administrador)
/inventory (catálogo de inventario, solo administrador)
/portal (acceso restringido para rol paciente, sin funcionalidad clínica)
/api/auth/logout (POST)
Reglas de protección (proxy.ts): sin sesión + ruta protegida → redirige a /login; con sesión + /login o /register → redirige a /. El layout de (dashboard) verifica rol server-side: si role === 'paciente' → redirige a /portal.
Sistema de Roles
paciente: solo /portal (pantalla de acceso restringido, sin funcionalidad).
odontologo: dashboard completo, CRUD de pacientes y citas, gestión de odontograma y documentos.
administrador: dashboard completo, CRUD + DELETE, lectura de todos los perfiles, acceso exclusivo a /inventory (catálogo y movimientos de inventario).
Rol siempre leído desde profiles en tiempo real, nunca desde JWT.
Patrones Establecidos
Server Actions para toda escritura, nunca API REST. SSR puro sin useEffect + fetch client-side. Buscador local reactivo sin re-fetch.
Error 23505 (unique_violation) interceptado con mensaje amigable (cédula duplicada en patients, conflicto ausente/extracción en odontograma).
Error 23P01 (exclusion_violation) interceptado con mensaje amigable (solapamiento de horario en appointments), tratado por código, nunca por texto del mensaje.
created_by / uploaded_by siempre asignado server-side desde auth.getUser(), nunca desde el payload del formulario.
revalidatePath invocado en el servidor tras mutaciones, nunca duplicado en el cliente.
Convención de testing: archivos de prueba únicamente dentro de carpetas __tests__, forzado estructuralmente por Vitest.
Disponibilidad de horarios centralizada en config.ts y availability.ts, con duración real por tipo de cita y buffer post-cita según el tipo de la cita existente, no de la candidata.
Subida de documentos: file_path generado server-side con patrón {patient_id}/{uuid}-{nombre-sanitizado}; nombre original preservado solo en file_name para mostrar al usuario; rollback automático del archivo en Storage si el insert en base de datos falla después de la subida; descarga exclusivamente vía URL firmada de 60 segundos, nunca URL pública.
Control de esquema de base de datos: toda modificación de esquema de base de datos debe realizarse exclusivamente mediante archivos de migración versionados en supabase/migrations, y está prohibido aplicar cambios de esquema directamente desde la consola SQL de Supabase o cualquier cliente directo.
Estado de Módulos
Autenticación (login/registro/roles): Completo y seguro.
CRUD de Pacientes (ficha básica): Completo — build y lint OK.
Citas y Agenda: Completo. Horario abierto (cualquier día/hora), catálogo de tipos de cita con duración y override manual, buffer de 10 min salvo urgencia, restricción de exclusión anti-solapamiento vía btree_gist, RLS completa con 4 políticas, 22 pruebas automatizadas.
Odontograma Visual: Completo. Componente OdontogramChart.tsx integrado con Server Actions (getOdontogramByPatient, createOdontogramRecord) en la página de detalle del paciente, guardado automático por interacción, sin reversión visual necesaria ante error porque el estado se deriva del prop records sin mutación optimista. Índice único de exclusión mutua ausente/extracción. 4 tests de componente añadidos (14 tests totales del dominio).
Documentos del Paciente (Storage): Completo. Bucket patient-attachments privado con límite de 5 MB y RLS. Server Actions con blocklist de ejecutables/scripts (extensión + mimetype), y Server Action deletePatientDocument implementada con validación de rol administrador en tiempo real. UI de listado y subida integrada en la ficha del paciente; botón de eliminación en UI deshabilitado temporalmente con "Próximamente".
Inventario: Completo. Ruta /inventory con catálogo de lectura (Server Component) y formulario de registro de movimientos de stock (client component). La Server Action registerInventoryMovement valida el rol de administrador en tiempo real contra public.profiles, invoca exclusivamente la función RPC register_inventory_movement y maneja errores de stock insuficiente extrayendo el stock disponible con regex (/Stock insuficiente.*Disponible:\s*(\d+)/i) con fallback seguro si no coincide. El formulario permanece en la misma pantalla tras éxito limpiando campos y mostrando una confirmación del movimiento. Incluye 8 pruebas en total (2 de catálogo y 6 de Server Action) integradas al conteo total del proyecto. Base de datos: inventory_products, inventory_movements, RLS completa y función register_inventory_movement.
Finanzas: Pendiente.
Reportes: Pendiente.
Portal del Paciente: Descartado como funcionalidad de producto. /portal es únicamente pantalla de acceso restringido.
Validaciones de Build
npm run build → EXIT_CODE: 0
npm run lint → 0 errores, 0 advertencias
npm run test → Vitest, 57 pruebas pasando en 11 archivos (environment, patients/actions, patients/documents/actions, appointments/actions, appointments/availability, appointments/AppointmentForm, odontogram/actions, odontogram/OdontogramChart, proxy/middleware, inventory/page, inventory/actions)
TypeScript → sin errores de tipos en todo el proyecto (incluye tipado corregido de mocks Supabase en appointments, patients y odontogram vía Awaited<ReturnType<typeof createClient>>)
CI (.github/workflows/ci.yml) → ejecuta en orden npm ci, npm run lint, npm run test, npm run build en cada push y pull request sobre Ubuntu con Node 22
Node local de desarrollo: v24.18.0, cumple engines >= 22
Control de Versiones
Historial local completo, organizado en commits lógicos por área. Sin repositorio remoto (git remote) configurado todavía.
- El commit `2be1d5a` quedó registrado en el historial sin que se pudiera confirmar de forma verificable en esta sesión quién o qué proceso lo ejecutó. Su contenido fue verificado como correcto vía `git show --stat`. Para evitar ambigüedades similares en el futuro, se adopta de ahora en adelante el protocolo explícito de tres pasos (`git status` -> `git commit` -> `git status` como llamadas de herramientas separadas).

Pendientes Registrados — No Urgentes
Módulos de Finanzas y Reportes, sin iniciar.
