import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/brevo'
import { renderEmail, type EmailJob, type EmailEventContext } from '@/lib/email/templates'

export const runtime = 'nodejs'

function authorized(request: Request) {
  const expected = process.env.EMAIL_WORKER_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!expected || !supplied) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b)
}

const retryAt = (attempts: number) => new Date(Date.now() + Math.min(30, 2 ** Math.max(attempts - 1, 0)) * 60_000 + Math.floor(Math.random() * 15_000)).toISOString()

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const batchSize = Math.min(Math.max(Number(request.headers.get('x-email-batch-size') ?? 10) || 10, 1), 50)
  const { error: recoveryError } = await supabase.rpc('recover_stale_email_jobs', { p_lease_seconds: 900 })
  if (recoveryError) return NextResponse.json({ success: false, message: 'Unable to recover stale jobs' }, { status: 503 })
  const { data: jobs, error: claimError } = await supabase.rpc('claim_email_jobs', { p_batch_size: batchSize, p_lease_seconds: 900 })
  if (claimError) return NextResponse.json({ success: false, message: 'Unable to claim jobs' }, { status: 503 })

  const { data: activeEvent } = await supabase.from('events').select('name, year, tagline, event_date, start_time, end_time, venue, whatsapp_group_url').eq('status', 'ACTIVE').maybeSingle()
  const eventContext: EmailEventContext | undefined = activeEvent
    ? {
        name: activeEvent.name,
        year: activeEvent.year,
        event_date: activeEvent.event_date,
        start_time: activeEvent.start_time,
        end_time: activeEvent.end_time,
        venue: activeEvent.venue,
        tagline: activeEvent.tagline,
        whatsapp_group_url: activeEvent.whatsapp_group_url,
      }
    : undefined

  const counts = { claimed: jobs?.length ?? 0, sent: 0, retried: 0, failed: 0, deferred: 0 }
  for (const rawJob of (jobs ?? []) as EmailJob[]) {
    const { data: quotaAvailable, error: quotaError } = await supabase.rpc('reserve_email_quota', { p_limit: 300 })
    if (quotaError || !quotaAvailable) {
      await supabase.from('email_jobs').update({ status: 'PENDING', scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), processing_started_at: null, last_error: 'Daily email quota reached', updated_at: new Date().toISOString() }).eq('id', rawJob.id).eq('status', 'PROCESSING')
      counts.deferred++
      continue
    }
    try {
      const rendered = renderEmail(rawJob, eventContext)
      const result = await sendTransactionalEmail({ to: [{ email: rawJob.recipient_email, name: rawJob.recipient_name }], subject: rendered.subject, htmlContent: rendered.htmlContent })
      const { error } = await supabase.from('email_jobs').update({ status: 'SENT', sent_at: new Date().toISOString(), processing_started_at: null, last_error: null, provider_message_id: result.messageId ?? null, provider_response: result.response, updated_at: new Date().toISOString() }).eq('id', rawJob.id).eq('status', 'PROCESSING')
      if (error) throw error
      counts.sent++
    } catch (error) {
      await supabase.rpc('release_email_quota')
      const typed = error as Error & { retryable?: boolean }
      const retryable = typed.retryable !== false && rawJob.payload?.force_permanent_failure !== true
      const exhausted = retryable && (rawJob as EmailJob & { attempts?: number; max_attempts?: number }).attempts! >= ((rawJob as EmailJob & { max_attempts?: number }).max_attempts ?? 3)
      const nextStatus = retryable && !exhausted ? 'PENDING' : 'FAILED'
      await supabase.from('email_jobs').update({ status: nextStatus, scheduled_at: nextStatus === 'PENDING' ? retryAt((rawJob as EmailJob & { attempts?: number }).attempts ?? 1) : undefined, failed_at: nextStatus === 'FAILED' ? new Date().toISOString() : null, processing_started_at: null, last_error: typed.message.slice(0, 500), updated_at: new Date().toISOString() }).eq('id', rawJob.id).eq('status', 'PROCESSING')
      if (nextStatus === 'PENDING') counts.retried++
      else counts.failed++
    }
  }
  return NextResponse.json({ success: true, counts })
}

export async function GET() { return NextResponse.json({ success: true, service: 'email-worker' }) }
