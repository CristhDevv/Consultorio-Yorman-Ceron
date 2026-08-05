import { Resend } from "resend"

let resendInstance: Resend | null = null

export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY variable is missing or empty.")
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

export interface SendEmailInput {
  to: string
  patientName: string
  appointmentDate: string // e.g., "15 de Octubre de 2026" o YYYY-MM-DD
  appointmentTime: string // e.g., "14:30"
  dentistName?: string    // e.g., "Dr. Yorman Cerón"
}

export type EmailSendResult =
  | { success: true; messageId: string }
  | { success: false; error: string }

/**
 * Sends a premium confirmation email to a patient using Resend.
 * Uses onboarding@resend.dev as sender.
 */
export async function sendConfirmationEmail(
  input: SendEmailInput
): Promise<EmailSendResult> {
  try {
    if (!input.to) {
      return { success: false, error: "Destinatario no especificado." }
    }

    const resendClient = getResendClient()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Cita Odontológica</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, #06b6d4 0%, #0db89e 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            color: #e0f2fe;
            margin: 10px 0 0 0;
            font-size: 14px;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #0f172a;
          }
          .details-card {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
          }
          .details-row {
            display: flex;
            margin-bottom: 12px;
          }
          .details-row:last-child {
            margin-bottom: 0;
          }
          .details-label {
            width: 120px;
            font-weight: 600;
            color: #64748b;
            font-size: 14px;
          }
          .details-value {
            flex: 1;
            color: #1e293b;
            font-size: 14px;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Consultorio Odontológico</h1>
            <p>Dr. Yorman Cerón</p>
          </div>
          <div class="content">
            <div class="greeting">¡Hola, ${input.patientName}!</div>
            <p>Tu cita odontológica ha sido programada exitosamente. A continuación encontrarás los detalles de tu consulta:</p>
            
            <div class="details-card">
              <div class="details-row">
                <div class="details-label">Fecha:</div>
                <div class="details-value">${input.appointmentDate}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Hora:</div>
                <div class="details-value">${input.appointmentTime}</div>
              </div>
              ${input.dentistName ? `
              <div class="details-row">
                <div class="details-label">Profesional:</div>
                <div class="details-value">${input.dentistName}</div>
              </div>
              ` : ""}
            </div>
            
            <p>Si necesitas reprogramar o cancelar tu cita, por favor contáctanos con anticipación.</p>
            <p>¡Te esperamos!</p>
          </div>
          <div class="footer">
            Este es un correo automático. Por favor no respondas a este mensaje.<br>
            &copy; 2026 Consultorio Odontológico Yorman Cerón. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `

    const response = await resendClient.emails.send({
      from: "onboarding@resend.dev",
      to: [input.to],
      subject: `Confirmación de Cita - Consultorio Yorman Cerón`,
      html: htmlContent,
    })

    if (response.error) {
      return { success: false, error: response.error.message }
    }

    return { success: true, messageId: response.data?.id || "" }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar correo."
    return { success: false, error: errorMessage }
  }
}
