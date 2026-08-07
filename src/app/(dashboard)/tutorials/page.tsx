"use client"

import React, { useState } from "react"
import {
  BookOpen,
  Search,
  Users,
  Calendar,
  DollarSign,
  Package,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Settings,
  Sparkles,
} from "lucide-react"

// Definición de las categorías de tutoriales
type Category = "primeros-pasos" | "expediente" | "agenda" | "finanzas-inventario" | "admin-avanzada"

interface TutorialStep {
  title: string
  description: string
}

interface Tutorial {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: Category
  steps: TutorialStep[]
  tip?: string
}

const TUTORIALS: Tutorial[] = [
  {
    id: "primeros-pasos-sucursales",
    title: "Inicio y Selección de Sucursal",
    description: "Aprende cómo acceder al sistema y cómo la sucursal activa define lo que ves y registras.",
    icon: Sparkles,
    category: "primeros-pasos",
    steps: [
      {
        title: "Iniciar Sesión",
        description: "Accede con tu correo electrónico y contraseña proporcionada por el administrador. El sistema redirigirá automáticamente según tu rol."
      },
      {
        title: "Selector de Sucursal",
        description: "En la barra lateral izquierda verás el selector de 'Sucursal Activa'. Elige la sucursal física en la que estás trabajando (ej: Sucursal Timbio o Sucursal La Fonda)."
      },
      {
        title: "Vista Multiclínica (Solo Administradores)",
        description: "Si eres Administrador, puedes seleccionar 'Todas las sucursales' para visualizar un consolidado general del negocio, aunque para crear registros nuevos (citas, pacientes) deberás definir una sucursal específica."
      }
    ],
    tip: "Cambiar de sucursal activa actualiza instantáneamente los pacientes, citas, inventarios y finanzas que visualizas en las distintas pantallas."
  },
  {
    id: "gestion-pacientes-expediente",
    title: "Creación de Pacientes y Expediente Clínico",
    description: "Guía paso a paso sobre cómo registrar un paciente y navegar por su historial médico y odontológico.",
    icon: Users,
    category: "expediente",
    steps: [
      {
        title: "Registrar Nuevo Paciente",
        description: "Ve a 'Pacientes', haz clic en 'Nuevo Paciente' y rellena sus datos básicos (Cédula/Documento, Nombre, Teléfono, Fecha de Nacimiento) y observaciones médicas clave."
      },
      {
        title: "Subir Documentos e Imágenes Clínicas",
        description: "Dentro de la ficha del paciente, arrastra o selecciona archivos de consentimiento o radiografías en las secciones correspondientes. El límite de tamaño es de 5MB por archivo."
      },
      {
        title: "Protección de Archivos",
        description: "Por seguridad, el sistema bloquea archivos ejecutables (.exe, .bat, .js) para evitar software dañino."
      }
    ],
    tip: "Los pacientes se registran vinculados a la sucursal en la que se crearon por defecto, ayudando a organizar la base de datos local."
  },
  {
    id: "odontograma-interactivo",
    title: "El Odontograma Digital",
    description: "Cómo registrar diagnósticos, caries y restauraciones pieza por pieza sobre el esquema dental interactivo.",
    icon: FileText,
    category: "expediente",
    steps: [
      {
        title: "Abrir Odontograma",
        description: "En la ficha del paciente verás el gráfico dental interactivo dividido en arcada superior e inferior."
      },
      {
        title: "Seleccionar Pieza y Estado General",
        description: "Haz clic en cualquier diente. Si deseas marcar una condición que afecte a toda la pieza (ej: ausente, corona o sano), selecciónala en el panel inferior."
      },
      {
        title: "Seleccionar Caras Específicas",
        description: "Si es un daño o tratamiento específico por cara (ej: caries u obturación), haz clic en la cara del diente en el gráfico (Vestibular, Lingual, Distal, Mesial u Oclusal) y asígnale su estado."
      },
      {
        title: "Guardar Notas y Confirmar",
        description: "Agrega notas específicas opcionales para la pieza y haz clic en 'Confirmar'. El gráfico se actualizará visualmente con colores codificados."
      }
    ]
  },
  {
    id: "agenda-citas-segura",
    title: "Agenda de Citas y Control de Horarios",
    description: "Cómo programar citas médicas y cómo funciona la prevención de solapamientos automáticos.",
    icon: Calendar,
    category: "agenda",
    steps: [
      {
        title: "Crear Nueva Cita",
        description: "Ve a 'Citas' y haz clic en 'Nueva Cita'. Selecciona el paciente (puedes buscarlo por nombre o cédula) y el odontólogo tratante."
      },
      {
        title: "Selección Dinámica de Horarios",
        description: "Al seleccionar el odontólogo y la fecha, el sistema consulta en tiempo real sus bloques horarios disponibles. Elige el slot conveniente."
      },
      {
        title: "Prevenir Solapamiento (Bloqueo Automático)",
        description: "El sistema cuenta con una restricción a nivel base de datos que impide agendar dos citas al mismo odontólogo a la misma hora en la misma sucursal. Si intentas forzar un cruce, verás una alerta amigable solicitando otro horario."
      }
    ],
    tip: "Cuando guardas una cita, el sistema envía automáticamente un correo de confirmación al paciente si su correo electrónico fue registrado."
  },
  {
    id: "finanzas-pagos",
    title: "Gestión de Finanzas y Reversiones",
    description: "Registra los ingresos y egresos de tratamientos y aprende cómo anular un cobro de forma segura.",
    icon: DollarSign,
    category: "finanzas-inventario",
    steps: [
      {
        title: "Registrar un Pago de Tratamiento",
        description: "Desde 'Finanzas', busca al paciente correspondiente. Visualizarás su resumen financiero. Haz clic en 'Registrar Pago'."
      },
      {
        title: "Completar la Transacción",
        description: "Define el tipo de cobro (Ingreso), el método de pago (Efectivo, Tarjeta, Transferencia) y el monto total cobrado."
      },
      {
        title: "Reversiones y Anulaciones",
        description: "Si cometiste un error o se realizó una devolución, registra un movimiento de tipo 'Reversión/Reembolso'. El sistema te solicitará ingresar el ID de la transacción original para mantener la trazabilidad contable."
      }
    ],
    tip: "Toda transacción queda permanentemente registrada vinculada a la sucursal activa para auditorías de caja."
  },
  {
    id: "inventario-clinico",
    title: "Control de Inventario y Alertas",
    description: "Monitorea los insumos odontológicos, registra movimientos y configura stock de seguridad.",
    icon: Package,
    category: "finanzas-inventario",
    steps: [
      {
        title: "Catálogo de Productos",
        description: "En 'Inventario' verás la lista de productos (ej: resinas, guantes, jeringas) con su stock actual y stock mínimo de seguridad."
      },
      {
        title: "Configurar Stock Mínimo",
        description: "Al crear o editar un producto, define el 'Stock Mínimo'. Cuando el stock actual caiga por debajo de este valor, el producto se resaltará automáticamente en rojo con una alerta visual."
      },
      {
        title: "Registrar Movimientos (Entradas y Salidas)",
        description: "Para actualizar existencias, usa 'Registrar Movimiento'. Registra entradas por compras o salidas por consumo clínico indicando la cantidad exacta."
      }
    ]
  },
  {
    id: "admin-avanzada-completos",
    title: "Herramientas de Administración y Auditoría",
    description: "Control de personal, logs de comunicaciones automáticas, reportes y papelera de recuperación.",
    icon: Settings,
    category: "admin-avanzada",
    steps: [
      {
        title: "Gestión de Personal y Sucursales",
        description: "En la sección de 'Personal', el administrador puede crear nuevos odontólogos y administradores. Puedes vincular a un odontólogo a múltiples sucursales a la vez para que pueda atender citas en ellas."
      },
      {
        title: "Historial de Comunicaciones",
        description: "Monitorea la pestaña de 'Comunicaciones' para auditar en tiempo real qué correos automáticos se han enviado, la fecha, hora exacta y si se entregaron exitosamente."
      },
      {
        title: "La Papelera de Reciclaje",
        description: "Si eliminas documentos o imágenes de un paciente por error, no se borran definitivamente. El administrador puede recuperarlos desde la sección 'Papelera' haciendo clic en 'Restaurar'."
      },
      {
        title: "Generación de Reportes",
        description: "Accede a 'Reportes' para descargar hojas de cálculo o resúmenes de citas, finanzas e inventarios acotados por fechas y sucursales específicas."
      }
    ]
  }
]

const FAQS = [
  {
    question: "¿Por qué no me aparecen horas disponibles para un odontólogo al crear una cita?",
    answer: "Esto puede deberse a tres factores: (1) El odontólogo no está trabajando en la fecha seleccionada. (2) El odontólogo ya tiene todas sus horas reservadas en ese rango. (3) No has seleccionado la sucursal correcta en la barra lateral donde el odontólogo tiene permisos de atención."
  },
  {
    question: "Eliminé una radiografía o diagnóstico por error, ¿cómo lo recupero?",
    answer: "Los archivos eliminados (imágenes y documentos) van directamente a la 'Papelera' (ubicada en el menú lateral). Solo un usuario con rol de Administrador puede ingresar a la papelera y restaurar el archivo directamente al perfil del paciente."
  },
  {
    question: "¿Cómo vinculo a un odontólogo a una nueva sucursal?",
    answer: "Ve a la sección 'Personal', busca al odontólogo y haz clic en 'Editar'. Allí podrás marcar las casillas correspondientes a todas las sucursales donde el odontólogo tiene permitido laborar."
  },
  {
    question: "¿El sistema me avisa si me estoy quedando sin existencias de un insumo?",
    answer: "Sí, cuando registres salidas de inventario y el producto quede por debajo de su 'Stock Mínimo' configurado, se mostrará un indicador de advertencia destacado en el panel de Inventario."
  }
]

export default function TutorialsPage() {
  const [activeTab, setActiveTab] = useState<Category>("primeros-pasos")
  const [searchQuery, setSearchQuery] = useState("")
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  // Filtrar tutoriales por búsqueda y pestaña
  const filteredTutorials = TUTORIALS.filter(tut => {
    const matchesTab = tut.category === activeTab
    const matchesSearch =
      tut.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tut.steps.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Si hay búsqueda, omitimos el filtro de tabs para mostrar todo lo relevante
    return searchQuery ? matchesSearch : matchesTab && matchesSearch
  })

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12">
      {/* Encabezado Principal Premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#00C8B4]/10 via-[#00A896]/5 to-transparent border border-[#00C8B4]/20 p-8 md:p-12 shadow-sm">
        <div className="absolute right-6 top-6 text-[#00C8B4]/20 pointer-events-none hidden md:block">
          <BookOpen className="w-40 h-40" />
        </div>
        <div className="max-w-2xl relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00C8B4]/15 text-[#008A7B] mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Centro de Aprendizaje
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1E293B] leading-tight">
            ¿Cómo usar el Consultorio Odontológico?
          </h1>
          <p className="text-[#64748B] text-base md:text-lg mt-3 leading-relaxed">
            Bienvenido al portal de ayuda. Aquí aprenderás a dominar las sucursales, citas, el odontograma interactivo, las finanzas y el inventario como un profesional.
          </p>
        </div>
      </div>

      {/* Barra de Búsqueda Dinámica */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Buscar un tema o tutorial... (ej: Odontograma, Citas, Reversión)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-[#E2E8F0] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-[#1E293B] placeholder-[#94A3B8] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00C8B4]/20 focus:border-[#00C8B4] transition-all font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabs de Navegación por Categoría (Omitidos si hay búsqueda activa) */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-px">
          {(
            [
              { id: "primeros-pasos", label: "Primeros Pasos" },
              { id: "expediente", label: "Expediente Clínico" },
              { id: "agenda", label: "Agenda & Citas" },
              { id: "finanzas-inventario", label: "Finanzas & Inventario" },
              { id: "admin-avanzada", label: "Admin Avanzada" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-[#00C8B4] text-[#008A7B]"
                  : "border-transparent text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Listado de Tutoriales */}
      <div className="flex flex-col gap-8">
        {filteredTutorials.length > 0 ? (
          filteredTutorials.map((tut) => {
            const Icon = tut.icon
            return (
              <div
                key={tut.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
              >
                {/* Cabecera del Tutorial */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#00C8B4]/10 flex items-center justify-center text-[#00A896] shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1E293B]">{tut.title}</h2>
                    <p className="text-[#64748B] text-sm mt-1">{tut.description}</p>
                  </div>
                </div>

                {/* Pasos detallados */}
                <div className="grid md:grid-cols-3 gap-6 relative">
                  {tut.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 relative">
                      {/* Indicador de Paso */}
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-xs font-bold text-[#475569] shrink-0">
                          {idx + 1}
                        </div>
                        {idx < tut.steps.length - 1 && (
                          <div className="w-0.5 h-full bg-[#E2E8F0] my-1 hidden md:block" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1E293B] leading-tight">{step.title}</h3>
                        <p className="text-[#64748B] text-xs mt-1.5 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Consejo Extra si existe */}
                {tut.tip && (
                  <div className="mt-6 flex items-start gap-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-4 text-[#166534] text-xs leading-relaxed">
                    <CheckCircle2 className="w-4.5 h-4.5 text-[#22C55E] shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-[#14532D]">Consejo Práctico:</strong> {tut.tip}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-sm">
            <Shield className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
            <h3 className="text-base font-bold text-[#1E293B]">No encontramos tutoriales para tu búsqueda</h3>
            <p className="text-[#64748B] text-xs mt-1.5">Intenta buscar palabras clave como &quot;citas&quot;, &quot;odontograma&quot; o &quot;pagos&quot;.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 bg-[#00C8B4] hover:bg-[#00A896] text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Mostrar todos
            </button>
          </div>
        )}
      </div>

      {/* Preguntas Frecuentes (FAQ) */}
      <div className="border-t border-[#E2E8F0] pt-8 mt-4">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-6 h-6 text-[#00A896]" />
          <h2 className="text-2xl font-bold text-[#1E293B]">Preguntas Frecuentes (FAQ)</h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx
            return (
              <div
                key={idx}
                className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#F8FAFC] transition-colors"
                >
                  <span className="text-sm font-bold text-[#1E293B]">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#64748B]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748B]" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 pt-1 border-t border-[#F1F5F9] bg-[#F8FAFC]">
                    <p className="text-xs text-[#64748B] leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sección final de soporte */}
      <div className="bg-[#1E293B] rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div>
          <h3 className="text-lg font-bold">¿Aún tienes dudas sobre alguna operación?</h3>
          <p className="text-[#94A3B8] text-xs mt-1.5 leading-relaxed">
            Contacta al soporte técnico del consultorio o solicita asistencia técnica personalizada a tu administrador.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold bg-[#334155] border border-[#475569] px-4 py-2 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
            Sistema en Línea
          </span>
        </div>
      </div>
    </div>
  )
}
