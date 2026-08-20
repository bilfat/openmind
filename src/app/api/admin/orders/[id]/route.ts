import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError('ID order tidak valid.', 400)

  try {
    const { supabase } = auth
    const orderQuery = await supabase
      .from('orders')
      .select('id, order_code, event_id, status, source, subtotal, discount_total, total_amount, currency, primary_participant_id, created_by, created_at, updated_at, events(id, name)')
      .eq('id', id)
      .maybeSingle()
    if (orderQuery.error) throw new Error(orderQuery.error.message)
    if (!orderQuery.data) return jsonError('Order tidak ditemukan.', 404)

    // Resolve the operator (admin/staff) who created walk-in / manual orders
    let createdByProfile: { full_name: string; role: string } | null = null
    if (orderQuery.data.created_by) {
      const { data: opProfile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', orderQuery.data.created_by)
        .maybeSingle()
      if (opProfile) createdByProfile = opProfile
    }

    const [paymentsQuery, referralQuery, itemsQuery] = await Promise.all([
      supabase.from('payments').select('id, order_id, payment_method, amount, status, proof_path, proof_file_name, proof_mime_type, proof_size_bytes, verified_by, verified_at, rejection_reason, created_at, updated_at').eq('order_id', id).order('created_at', { ascending: false }).order('id', { ascending: false }),
      supabase.from('referral_redemptions').select('id, discount_amount, status, reserved_at, consumed_at, released_at, created_at, referral_codes(id, code, discount_type, discount_value, max_discount)').eq('order_id', id).order('created_at', { ascending: false }),
      supabase.from('order_items').select('id, order_id, ticket_type_id, participant_id, unit_price, discount_amount, line_total, created_at, participants(id, event_id, full_name, email, whatsapp, nim, faculty, study_program, instagram_username, created_at, updated_at), ticket_types(id, name, code, ticket_type, final_price)').eq('order_id', id).order('created_at', { ascending: true }).order('id', { ascending: true }),
    ])
    if (paymentsQuery.error || referralQuery.error || itemsQuery.error) throw new Error(paymentsQuery.error?.message || referralQuery.error?.message || itemsQuery.error?.message)

    const itemIds = (itemsQuery.data ?? []).map((item: any) => item.id)
    const ticketQuery = itemIds.length
      ? await supabase.from('issued_tickets').select('id, ticket_code, order_id, order_item_id, ticket_type_id, participant_id, status, issued_at, cancelled_at, created_at, updated_at').in('order_item_id', itemIds)
      : { data: [], error: null }
    if (ticketQuery.error) throw new Error(ticketQuery.error.message)
    const emailQuery = await supabase.from('email_jobs').select('id, job_type, status, attempts, max_attempts, scheduled_at, processing_started_at, sent_at, failed_at, last_error, issued_ticket_id, order_id, created_at, updated_at').eq('order_id', id).order('created_at', { ascending: false })
    if (emailQuery.error) throw new Error(emailQuery.error.message)

    const ticketsByItem = (ticketQuery.data ?? []).reduce((acc: Record<string, any>, ticket: any) => { acc[ticket.order_item_id] = ticket; return acc }, {})
    const emailsByTicket = (emailQuery.data ?? []).reduce((acc: Record<string, any[]>, job: any) => { if (job.issued_ticket_id) (acc[job.issued_ticket_id] ??= []).push(job); return acc }, {})
    const orderItems = (itemsQuery.data ?? []).map((item: any) => ({
      item: { id: item.id, order_id: item.order_id, ticket_type_id: item.ticket_type_id, participant_id: item.participant_id, unit_price: item.unit_price, discount_amount: item.discount_amount, line_total: item.line_total, created_at: item.created_at },
      participant: item.participants,
      ticket_type: item.ticket_types,
      issued_ticket: ticketsByItem[item.id] ?? null,
      email_jobs: ticketsByItem[item.id] ? emailsByTicket[ticketsByItem[item.id].id] ?? [] : [],
    }))

    const paymentsWithUrls = await Promise.all((paymentsQuery.data ?? []).map(async (p: any) => {
      let proofUrl = null;
      if (p.proof_path) {
        const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(p.proof_path, 3600);
        proofUrl = signed?.signedUrl || null;
      }
      return { ...p, proof_url: proofUrl };
    }));

    return NextResponse.json({ success: true, order: { ...orderQuery.data, created_by_profile: createdByProfile }, payments: paymentsWithUrls, referral: referralQuery.data?.[0] ?? null, order_items: orderItems, email_jobs: emailQuery.data ?? [] })
  } catch (error) {
    console.error('Admin order detail read error:', error)
    return jsonError('Gagal mengambil detail pesanan.', 500)
  }
}
