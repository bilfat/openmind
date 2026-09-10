import { NextResponse } from 'next/server'
import { requireEventSuperAdmin } from '@/lib/event-admin-auth'
import { jsonError } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'
import { writeAuditLog } from '@/lib/audit'

/* eslint-disable @typescript-eslint/no-explicit-any */

async function handlePatchParticipant(
  request: Request,
  context?: { params: Promise<{ id: string }> }
) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const params = await context?.params
  const participantId = params?.id
  if (!participantId) return jsonError('ID peserta tidak valid.', 400)

  let body: any
  try {
    body = await request.json()
  } catch {
    return jsonError('Body request tidak valid.', 400)
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : undefined
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
  const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : undefined
  const nim = typeof body.nim === 'string' ? body.nim.trim() : undefined
  const faculty = typeof body.faculty === 'string' ? body.faculty.trim() : undefined
  const studyProgram = typeof body.study_program === 'string' ? body.study_program.trim() : undefined

  if (fullName !== undefined && (!fullName || fullName.length > 150)) {
    return jsonError('Nama lengkap wajib diisi (maksimal 150 karakter).', 400)
  }
  if (email !== undefined && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return jsonError('Format email tidak valid.', 400)
  }
  if (whatsapp !== undefined && (!whatsapp || whatsapp.length > 25)) {
    return jsonError('Nomor WhatsApp wajib diisi (maksimal 25 karakter).', 400)
  }
  if (nim !== undefined && nim.length > 50) {
    return jsonError('NIM maksimal 50 karakter.', 400)
  }
  if (faculty !== undefined && faculty.length > 100) {
    return jsonError('Fakultas maksimal 100 karakter.', 400)
  }
  if (studyProgram !== undefined && studyProgram.length > 100) {
    return jsonError('Program studi maksimal 100 karakter.', 400)
  }

  const { supabaseAdmin, userId } = auth

  try {
    // Fetch current participant record first for audit logging
    const { data: currentParticipant, error: fetchError } = await supabaseAdmin
      .from('participants')
      .select('id, full_name, email, whatsapp, nim, faculty, study_program')
      .eq('id', participantId)
      .maybeSingle()

    if (fetchError || !currentParticipant) {
      return jsonError('Data peserta tidak ditemukan.', 404)
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (fullName !== undefined) updates.full_name = fullName
    if (email !== undefined) updates.email = email
    if (whatsapp !== undefined) updates.whatsapp = whatsapp
    if (nim !== undefined) updates.nim = nim
    if (faculty !== undefined) updates.faculty = faculty
    if (studyProgram !== undefined) updates.study_program = studyProgram

    const { data: updatedParticipant, error: updateError } = await supabaseAdmin
      .from('participants')
      .update(updates)
      .eq('id', participantId)
      .select()
      .single()

    if (updateError || !updatedParticipant) {
      console.error('Participant update error:', updateError)
      return jsonError('Gagal memperbarui data peserta.', 500)
    }

    // Write audit log
    try {
      await writeAuditLog({
        actorProfileId: userId,
        action: 'UPDATE_PARTICIPANT_MASTER_DATA',
        entityType: 'participants',
        entityId: participantId,
        metadata: {
          previous: currentParticipant,
          updated: updates,
        },
        client: supabaseAdmin,
      })
    } catch (auditErr) {
      console.warn('Failed to write audit log for participant edit:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Data peserta berhasil diperbarui.',
      participant: updatedParticipant,
    })
  } catch (err: any) {
    console.error('API handlePatchParticipant error:', err)
    return jsonError('Terjadi kesalahan pada server.', 500)
  }
}

async function handleDeleteParticipant(
  _request: Request,
  context?: { params: Promise<{ id: string }> }
) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const params = await context?.params
  const participantId = params?.id
  if (!participantId) return jsonError('ID peserta tidak valid.', 400)

  const { supabaseAdmin, userId } = auth

  try {
    // 1. Fetch participant to ensure existence & get data for audit log
    const { data: currentParticipant, error: fetchError } = await supabaseAdmin
      .from('participants')
      .select('id, full_name, email, whatsapp, nim, faculty, study_program')
      .eq('id', participantId)
      .maybeSingle()

    if (fetchError || !currentParticipant) {
      return jsonError('Data peserta tidak ditemukan.', 404)
    }

    // 2. Find all order_items linked to this participant
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id')
      .eq('participant_id', participantId)

    const orderItemIds = (orderItems ?? []).map((oi) => oi.id)
    const associatedOrderIds = [...new Set((orderItems ?? []).map((oi) => oi.order_id).filter(Boolean))]

    // 3. Find all issued tickets linked to this participant or these order_items
    const { data: issuedTickets } = await supabaseAdmin
      .from('issued_tickets')
      .select('id')
      .or(`participant_id.eq.${participantId}${orderItemIds.length ? `,order_item_id.in.(${orderItemIds.join(',')})` : ''}`)

    const ticketIds = (issuedTickets ?? []).map((t) => t.id)

    // 4. Delete check_ins
    if (ticketIds.length > 0) {
      await supabaseAdmin.from('check_ins').delete().in('ticket_id', ticketIds)
    }

    // 5. Delete issued_tickets
    if (ticketIds.length > 0) {
      await supabaseAdmin.from('issued_tickets').delete().in('id', ticketIds)
    } else {
      await supabaseAdmin.from('issued_tickets').delete().eq('participant_id', participantId)
    }

    // 6. Delete order_items
    await supabaseAdmin.from('order_items').delete().eq('participant_id', participantId)

    // 7. Check if associated orders have any remaining order_items; if empty, delete order
    for (const orderId of associatedOrderIds) {
      const { count } = await supabaseAdmin
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId)

      if (count === 0) {
        // Delete payment proofs & email jobs if any, then delete order
        await supabaseAdmin.from('payment_proofs').delete().eq('order_id', orderId)
        await supabaseAdmin.from('email_jobs').delete().filter('payload->>order_id', 'eq', orderId)
        await supabaseAdmin.from('orders').delete().eq('id', orderId)
      }
    }

    // 8. Delete participant row
    const { error: deleteError } = await supabaseAdmin
      .from('participants')
      .delete()
      .eq('id', participantId)

    if (deleteError) {
      console.error('Participant delete error:', deleteError)
      return jsonError(`Gagal menghapus peserta: ${deleteError.message}`, 500)
    }

    // 9. Write audit log
    try {
      await writeAuditLog({
        actorProfileId: userId,
        action: 'DELETE_PARTICIPANT_MASTER_DATA',
        entityType: 'participants',
        entityId: participantId,
        metadata: {
          deletedParticipant: currentParticipant,
          deletedOrderItemCount: orderItemIds.length,
          deletedTicketCount: ticketIds.length,
        },
        client: supabaseAdmin,
      })
    } catch (auditErr) {
      console.warn('Failed to write audit log for participant deletion:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Data peserta berhasil dihapus secara permanen dari database.',
    })
  } catch (err: any) {
    console.error('API handleDeleteParticipant error:', err)
    return jsonError('Terjadi kesalahan pada server saat menghapus data.', 500)
  }
}

export const PATCH = withTimeoutGuard(handlePatchParticipant)
export const DELETE = withTimeoutGuard(handleDeleteParticipant)
