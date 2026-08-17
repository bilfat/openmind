import 'server-only'

export type BrevoEmailInput = {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
}

export type BrevoSendResult = {
  messageId?: string
  response: Record<string, unknown>
}

export async function sendTransactionalEmail(input: BrevoEmailInput): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME
  if (!apiKey || !senderEmail || !senderName) throw new Error('Brevo server configuration is incomplete')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ sender: { email: senderEmail, name: senderName }, to: input.to, subject: input.subject, htmlContent: input.htmlContent }),
      signal: controller.signal,
      cache: 'no-store',
    })
    const raw = await response.text()
    let parsed: Record<string, unknown> = {}
    try { parsed = raw ? JSON.parse(raw) : {} } catch { parsed = { status: response.status } }
    if (!response.ok) {
      const error = typeof parsed.message === 'string' ? parsed.message : `Brevo HTTP ${response.status}`
      const providerError = new Error(error) as Error & { retryable?: boolean; providerStatus?: number }
      providerError.providerStatus = response.status
      providerError.retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500
      throw providerError
    }
    return { messageId: typeof parsed.messageId === 'string' ? parsed.messageId : undefined, response: parsed }
  } finally { clearTimeout(timeout) }
}
