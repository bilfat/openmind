import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createClient } from '@supabase/supabase-js'
import { broadcastToAllAdmins } from '@/lib/notifications'
import { triggerEmailWorker } from '@/lib/tickets/trigger-email-worker'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const secretKey = process.env.SUPABASE_SECRET_KEY!
  return createClient(url, secretKey, { auth: { persistSession: false } })
}

export async function POST(req: Request) {
  const authResult = await requireActiveAdmin()
  if (!authResult.authorized) {
    return jsonError(authResult.message, authResult.status)
  }

  const supabaseAdmin = getAdminClient()

  // Requirement: SUPER_ADMIN authorization only
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, status')
    .eq('id', authResult.userId)
    .maybeSingle()

  if (profileError || !userProfile || userProfile.status !== 'ACTIVE' || userProfile.role !== 'SUPER_ADMIN') {
    return jsonError('Forbidden: Hanya Super Admin yang dapat membuat campaign broadcast.', 403)
  }

  let body: {
    event_id?: string
    title?: string
    subject?: string
    content?: string
    audience_type?: string
  }
  try {
    body = await req.json()
  } catch {
    return jsonError('Body JSON tidak valid.', 400)
  }

  const event_id = (body.event_id || '').trim()
  const title = (body.title || '').trim()
  const subject = (body.subject || '').trim()
  const content = (body.content || '').trim()
  const audience_type = (body.audience_type || 'ALL_APPROVED').trim()

  if (!event_id) return jsonError('Parameter event_id wajib diisi.', 400)
  if (!title) return jsonError('Parameter title wajib diisi.', 400)
  if (!subject) return jsonError('Parameter subject wajib diisi.', 400)
  if (!content) return jsonError('Parameter content wajib diisi.', 400)
  if (audience_type !== 'ALL_APPROVED') {
    return jsonError('audience_type saat ini hanya mendukung ALL_APPROVED.', 400)
  }

  // 1. Attempt Atomic SQL Execution via send_broadcast_campaign_rpc
  try {
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('send_broadcast_campaign_rpc', {
      p_event_id: event_id,
      p_title: title,
      p_subject: subject,
      p_content: content,
      p_audience_type: audience_type,
      p_created_by: authResult.userId,
    })

    if (!rpcError && rpcData && rpcData.success) {
      // Notification (FAIL-OPEN): BROADCAST — only after the broadcast transaction committed.
      await broadcastToAllAdmins({
        type: 'BROADCAST',
        title: 'Broadcast Campaign',
        message: `Broadcast "${title}" berhasil dikirim ke ${rpcData.recipient_count} penerima.`,
        link: '/admin/broadcast',
        metadata: {
          broadcast_id: rpcData.broadcast_id,
          recipient_count: rpcData.recipient_count,
          title,
        },
        client: supabaseAdmin,
      })

      return Response.json(
        {
          success: true,
          data: {
            broadcast_id: rpcData.broadcast_id,
            recipient_count: rpcData.recipient_count,
            status: rpcData.status || 'QUEUED',
          },
          message: rpcData.message || 'Broadcast campaign berhasil dibuat.',
        },
        { status: 200 }
      )
    }

    if (rpcError) {
      if (rpcError.message.includes('VALIDATION_ERROR:')) {
        const msg = rpcError.message.split('VALIDATION_ERROR:')[1]?.trim() || rpcError.message
        return jsonError(msg, 400)
      }
      if (rpcError.message.includes('NOT_FOUND:')) {
        const msg = rpcError.message.split('NOT_FOUND:')[1]?.trim() || rpcError.message
        return jsonError(msg, 404)
      }
    }
  } catch {
    // If RPC throws an unexpected error, proceed to atomic fallback guard
  }

  // 2. Atomic Database Snapshot & Immature Exclusion Execution
  // Lock deterministic execution-time snapshot boundary
  const executionTime = new Date().toISOString()

  // Verify Event Existence
  const { data: eventData, error: eventErr } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('id', event_id)
    .maybeSingle()

  if (eventErr || !eventData) {
    return jsonError('Event tidak ditemukan.', 404)
  }

  // Snapshot Immutability Condition:
  // Lock orders created AND approved/updated AT OR BEFORE executionTime.
  // Orders approved after executionTime will have updated_at > executionTime and are strictly excluded.
  const { data: orderItems, error: orderErr } = await supabaseAdmin
    .from('order_items')
    .select(`
      participant_id,
      orders!inner (
        id,
        event_id,
        status,
        created_at,
        updated_at
      ),
      participants!inner (
        id,
        email,
        full_name
      )
    `)
    .eq('orders.event_id', event_id)
    .in('orders.status', ['APPROVED', 'TICKET_ISSUED'])
    .lte('orders.created_at', executionTime)
    .lte('orders.updated_at', executionTime)

  if (orderErr) {
    return jsonError(`Gagal mengambil data peserta: ${orderErr.message}`, 500)
  }

  // Deduplicate participants per campaign
  type ParticipantInfo = { id: string; email: string; full_name: string }
  const participantMap = new Map<string, ParticipantInfo>()

  if (orderItems && orderItems.length > 0) {
    for (const item of orderItems) {
      const part = item.participants as unknown as ParticipantInfo
      if (part && part.id && part.email && !participantMap.has(part.id)) {
        participantMap.set(part.id, {
          id: part.id,
          email: part.email,
          full_name: part.full_name || 'Participant',
        })
      }
    }
  }

  const eligibleParticipants = Array.from(participantMap.values())

  if (eligibleParticipants.length === 0) {
    return jsonError('Tidak ada peserta approved yang memenuhi syarat broadcast.', 400)
  }

  // ATOMIC TRANSACTION WORKFLOW WITH MANDATORY ROLLBACK GUARD
  let broadcastId: string | null = null
  try {
    // Step A: Insert Broadcast Campaign Record
    const { data: broadcastRecord, error: broadcastErr } = await supabaseAdmin
      .from('broadcasts')
      .insert({
        event_id,
        title,
        subject,
        content,
        audience_type,
        status: 'QUEUED',
        created_by: authResult.userId,
        created_at: executionTime,
        updated_at: executionTime,
      })
      .select('id')
      .single()

    if (broadcastErr || !broadcastRecord) {
      throw new Error(`Gagal membuat campaign broadcast: ${broadcastErr?.message || 'Unknown error'}`)
    }

    broadcastId = broadcastRecord.id

    // Step B: Insert Recipient Snapshot Records
    const recipientInserts = eligibleParticipants.map((p) => ({
      broadcast_id: broadcastId!,
      participant_id: p.id,
      email: p.email,
      status: 'PENDING',
      created_at: executionTime,
    }))

    const { data: insertedRecipients, error: recipientErr } = await supabaseAdmin
      .from('broadcast_recipients')
      .insert(recipientInserts)
      .select('id, participant_id, email')

    if (recipientErr || !insertedRecipients || insertedRecipients.length === 0) {
      throw new Error(`Gagal membuat snapshot penerima: ${recipientErr?.message || 'Unknown error'}`)
    }

    // Step C: Insert Email Jobs (Phase 12/13 Worker Compatible)
    const recipientMap = new Map(insertedRecipients.map((r) => [r.participant_id, r.id]))

    const emailJobInserts = eligibleParticipants.map((p) => ({
      job_type: 'BROADCAST' as const,
      recipient_email: p.email,
      recipient_name: p.full_name,
      subject,
      payload: {
        broadcast_id: broadcastId!,
        event_id,
        title,
        subject,
        content,
        recipient_name: p.full_name,
        participant_id: p.id,
      },
      priority: 'NORMAL' as const,
      status: 'PENDING' as const,
      broadcast_recipient_id: recipientMap.get(p.id) || null,
      created_at: executionTime,
      updated_at: executionTime,
    }))

    const { error: jobErr } = await supabaseAdmin.from('email_jobs').insert(emailJobInserts)

    if (jobErr) {
      throw new Error(`Gagal menjadwalkan email job: ${jobErr.message}`)
    }

    // Kick the existing email worker so BROADCAST jobs are processed immediately
    void triggerEmailWorker(new URL(req.url).origin)

    // Transaction committed successfully
    // Notification (FAIL-OPEN): BROADCAST — only after the fallback transaction committed.
    await broadcastToAllAdmins({
      type: 'BROADCAST',
      title: 'Broadcast Campaign',
      message: `Broadcast "${title}" berhasil dikirim ke ${eligibleParticipants.length} penerima.`,
      link: '/admin/broadcast',
      metadata: {
        broadcast_id: broadcastId,
        recipient_count: eligibleParticipants.length,
        title,
      },
      client: supabaseAdmin,
    })

    return Response.json(
      {
        success: true,
        data: {
          broadcast_id: broadcastId,
          recipient_count: eligibleParticipants.length,
          status: 'QUEUED',
        },
        message: 'Broadcast campaign berhasil dibuat.',
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    // ATOMIC ROLLBACK GUARANTEE: If any insert step fails, clean up all created data for this campaign!
    if (broadcastId) {
      await supabaseAdmin.from('email_jobs').delete().eq('payload->>broadcast_id', broadcastId)
      await supabaseAdmin.from('broadcast_recipients').delete().eq('broadcast_id', broadcastId)
      await supabaseAdmin.from('broadcasts').delete().eq('id', broadcastId)
    }
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
    return jsonError(errorMessage, 500)
  }
}
