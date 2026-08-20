import { requireActiveOperator, jsonError } from '@/lib/admin-read-auth'
import { createClient } from '@supabase/supabase-js'
import { writeAuditLog } from '@/lib/audit'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const secretKey = process.env.SUPABASE_SECRET_KEY!
  return createClient(url, secretKey, { auth: { persistSession: false } })
}

export async function POST(req: Request) {
  const authResult = await requireActiveOperator()
  if (!authResult.authorized) {
    return jsonError(authResult.message, authResult.status)
  }

  let body: { identifier?: string; method?: string; notes?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError('Body JSON tidak valid.', 400)
  }

  const rawIdentifier = body.identifier
  if (!rawIdentifier || typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
    return jsonError('Parameter identifier (QR token atau ticket code) wajib diisi.', 400)
  }

  const identifier = rawIdentifier.trim()
  if (identifier.length > 100) {
    return jsonError('Identifier maksimal 100 karakter.', 400)
  }

  const method = (body.method === 'MANUAL' ? 'MANUAL' : 'QR_SCAN') as 'QR_SCAN' | 'MANUAL'
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null

  const supabaseAdmin = getAdminClient()

  // Guardrail 2: Production API MUST hardcode p_force_failure: false
  let rpcData: {
    success: boolean
    status: string
    message: string
    data?: {
      ticket?: { id?: string; ticketCode?: string }
      orderCode?: string
      checkedInCount?: number
      checkInId?: string
      method?: string
    }
  } | null = null
  let rpcError: unknown = null
  try {
    const ticketRes = await supabaseAdmin.rpc('check_in_ticket_rpc', {
      p_identifier: identifier,
      p_checked_in_by: authResult.userId,
      p_method: method,
      p_notes: notes,
      p_force_failure: false,
    })
    rpcError = ticketRes.error
    rpcData = ticketRes.data

    // Fallback: if identifier is not a ticket QR token / ticket code,
    // treat it as an order code and check in ALL tickets under that order.
    if (!rpcError && rpcData && rpcData.status === 'NOT_FOUND') {
      const orderRes = await supabaseAdmin.rpc('check_in_order_rpc', {
        p_order_code: identifier,
        p_checked_in_by: authResult.userId,
        p_method: 'MANUAL',
        p_notes: notes,
      })
      if (!orderRes.error && orderRes.data && orderRes.data.status !== 'NOT_FOUND') {
        rpcData = orderRes.data
      }
    }
  } catch {
    // Fallback if RPC call throws exception or is missing in schema cache
    rpcData = null
  }

  if (!rpcError && rpcData) {
    const statusMap: Record<string, number> = {
      SUCCESS: 200,
      ALREADY_CHECKED_IN: 409,
      TICKET_CANCELLED: 400,
      NOT_FOUND: 404,
    }
    const httpStatus = statusMap[rpcData.status] || (rpcData.success ? 200 : 400)

    return Response.json(rpcData, { status: httpStatus })
  }

  // Fallback direct logic if RPC is not present in schema cache
  let { data: ticket } = await supabaseAdmin
    .from('issued_tickets')
    .select('id, ticket_code, qr_token, status, participant_id, ticket_type_id, order_id')
    .eq('qr_token', identifier)
    .maybeSingle()

  if (!ticket) {
    const { data: ticketByCode } = await supabaseAdmin
      .from('issued_tickets')
      .select('id, ticket_code, qr_token, status, participant_id, ticket_type_id, order_id')
      .eq('ticket_code', identifier)
      .maybeSingle()
    ticket = ticketByCode
  }

  if (!ticket) {
    // Fallback: try order-code based check-in directly (all ACTIVE tickets in the order)
    const orderRes = await supabaseAdmin.rpc('check_in_order_rpc', {
      p_order_code: identifier,
      p_checked_in_by: authResult.userId,
      p_method: 'MANUAL',
      p_notes: notes,
    })
    if (!orderRes.error && orderRes.data && orderRes.data.status !== 'NOT_FOUND') {
      const orderStatusMap: Record<string, number> = {
        SUCCESS: 200,
        ALREADY_CHECKED_IN: 409,
        TICKET_CANCELLED: 400,
        NOT_FOUND: 404,
      }
      const orderHttpStatus = orderStatusMap[orderRes.data.status] || (orderRes.data.success ? 200 : 400)

      return Response.json(orderRes.data, { status: orderHttpStatus })
    }

    return Response.json(
      {
        success: false,
        status: 'NOT_FOUND',
        message: 'Tiket atau order tidak ditemukan.',
      },
      { status: 404 }
    )
  }

  if (ticket.status === 'CANCELLED') {
    return Response.json(
      {
        success: false,
        status: 'TICKET_CANCELLED',
        message: 'Tiket ini telah dibatalkan dan tidak berlaku.',
      },
      { status: 400 }
    )
  }

  // Check if already checked in
  const { data: existingCheckIn } = await supabaseAdmin
    .from('check_ins')
    .select('id, checked_in_at, method, checked_in_by')
    .eq('issued_ticket_id', ticket.id)
    .maybeSingle()

  if (ticket.status === 'CHECKED_IN' || existingCheckIn) {
    let operatorName = 'Admin'
    if (existingCheckIn?.checked_in_by) {
      const { data: opProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', existingCheckIn.checked_in_by)
        .maybeSingle()
      if (opProfile?.full_name) operatorName = opProfile.full_name
    }

    const { data: partData } = await supabaseAdmin
      .from('participants')
      .select('full_name')
      .eq('id', ticket.participant_id)
      .maybeSingle()

    return Response.json(
      {
        success: false,
        status: 'ALREADY_CHECKED_IN',
        message: 'Peserta ini sudah melakukan check-in sebelumnya.',
        data: {
          checkedInAt: existingCheckIn?.checked_in_at || new Date().toISOString(),
          checkedInBy: operatorName,
          method: existingCheckIn?.method || 'QR_SCAN',
          participantName: partData?.full_name || '-',
          ticketCode: ticket.ticket_code,
        },
      },
      { status: 409 }
    )
  }

  // Attempt INSERT into check_ins (enforcing UNIQUE constraint on issued_ticket_id)
  const nowStr = new Date().toISOString()
  const { data: insertedCheckIn, error: insertError } = await supabaseAdmin
    .from('check_ins')
    .insert({
      issued_ticket_id: ticket.id,
      checked_in_by: authResult.userId,
      checked_in_at: nowStr,
      method,
      notes,
    })
    .select('id')
    .single()

  if (insertError) {
    // Unique constraint violation code '23505'
    if (insertError.code === '23505' || insertError.message.includes('unique')) {
      const { data: partData } = await supabaseAdmin
        .from('participants')
        .select('full_name')
        .eq('id', ticket.participant_id)
        .maybeSingle()

      return Response.json(
        {
          success: false,
          status: 'ALREADY_CHECKED_IN',
          message: 'Peserta ini sudah melakukan check-in sebelumnya.',
          data: {
            checkedInAt: nowStr,
            checkedInBy: 'Admin',
            method,
            participantName: partData?.full_name || '-',
            ticketCode: ticket.ticket_code,
          },
        },
        { status: 409 }
      )
    }

    return jsonError(`Gagal mencatat check-in: ${insertError.message}`, 500)
  }

  // Update issued_tickets status to CHECKED_IN
  await supabaseAdmin
    .from('issued_tickets')
    .update({ status: 'CHECKED_IN', updated_at: nowStr })
    .eq('id', ticket.id)

  // Write audit log entry (Phase 21)
  await writeAuditLog({
    actorProfileId: authResult.userId,
    action: 'CHECK_IN',
    entityType: 'issued_tickets',
    entityId: ticket.id,
    metadata: {
      ticket_code: ticket.ticket_code,
      check_in_id: insertedCheckIn.id,
      method,
    },
    client: supabaseAdmin,
  })

  // Load participant, ticket_type, order, and operator details
  const { data: participant } = await supabaseAdmin
    .from('participants')
    .select('full_name, email, whatsapp, nim, faculty')
    .eq('id', ticket.participant_id)
    .maybeSingle()

  const { data: ticketType } = await supabaseAdmin
    .from('ticket_types')
    .select('name')
    .eq('id', ticket.ticket_type_id)
    .maybeSingle()

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('order_code')
    .eq('id', ticket.order_id)
    .maybeSingle()

  const { data: operator } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', authResult.userId)
    .maybeSingle()

  return Response.json(
    {
      success: true,
      status: 'SUCCESS',
      message: 'Check-in Berhasil! Silakan berikan Merchandise & Name Tag kepada peserta.',
      data: {
        checkInId: insertedCheckIn.id,
        checkedInAt: nowStr,
        method,
        notes,
        operatorName: operator?.full_name || 'Admin',
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          qrToken: ticket.qr_token,
          status: 'CHECKED_IN',
          ticketTypeName: ticketType?.name || '-',
          participant: {
            fullName: participant?.full_name || '-',
            email: participant?.email || '-',
            whatsapp: participant?.whatsapp || '-',
            nim: participant?.nim || '-',
            faculty: participant?.faculty || '-',
          },
          order: {
            orderCode: order?.order_code || '-',
          },
        },
      },
    },
    { status: 200 }
  )
}
