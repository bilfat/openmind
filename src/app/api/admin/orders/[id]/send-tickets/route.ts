import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { sendTicketEmailsForOrder } from '@/lib/tickets/send-ticket-email'
import { triggerEmailWorker } from '@/lib/tickets/trigger-email-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin-only. Queues NEW TICKET_ISSUED email jobs for an order whose tickets are
 * already issued, then fires the existing email worker once so the jobs are
 * CLAIM → PROCESS → SEND'd right away. Reuses the existing email_jobs + email
 * worker pipeline; the browser never sends email directly.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { id: orderId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return jsonError('ID order tidak valid.', 400)

  try {
    const result = await sendTicketEmailsForOrder(auth.supabase, orderId, auth.userId)
    if (!result.success) return jsonError(result.message, 409)
    // Best-effort kick of the existing worker. On failure jobs stay PENDING and
    // any external/scheduled trigger still delivers them.
    void triggerEmailWorker(new URL(request.url).origin)
    return NextResponse.json({
      success: true,
      message: result.message,
      orderId: result.orderId,
      jobsCreated: result.jobsCreated,
      recipients: result.recipients,
    })
  } catch (error) {
    console.error('Admin send ticket email error:', error instanceof Error ? error.message : 'unknown')
    return jsonError('Gagal mengirim e-ticket.', 500)
  }
}