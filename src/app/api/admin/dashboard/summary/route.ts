import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Ringkasan cepat untuk dashboard: tiket aktif, kode referal aktif (super
// admin saja), tanpa menyentuh halaman navigasi lain.
async function handleGetDashboardSummary() {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const supabaseAdmin = createAdminClient()

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .maybeSingle()

    const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

    const { data: activeEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    let activeTickets = { total: 0, items: [] as any[] }
    let activeReferrals = null as null | { total: number; items: any[] }

    if (activeEvent) {
      // ── Tiket aktif (ticket_types berstatus ACTIVE) ──────────────────
      const { data: tickets, error: ticketsError } = await supabaseAdmin
        .from('ticket_types')
        .select('id, name, code, ticket_type, quota, status, final_price')
        .eq('event_id', activeEvent.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: true })

      if (ticketsError) throw new Error(ticketsError.message)

      const ticketIds = (tickets ?? []).map((t: any) => t.id)
      const issuedCounts: Record<string, number> = {}
      const pendingCounts: Record<string, number> = {}
      if (ticketIds.length) {
        const [issuedRes, newOrdersRes] = await Promise.all([
          supabaseAdmin
            .from('issued_tickets')
            .select('ticket_type_id')
            .in('ticket_type_id', ticketIds)
            .neq('status', 'CANCELLED'),
          // "Pending" = tiket (item pesanan) dari pesanan yang belum di-approve
          // (WAITING_VERIFICATION) + pesanan baru yang belum upload bukti
          // pembayaran (DRAFT pada alur baru, PENDING_PAYMENT pada alur lama).
          // Definisi ini konsisten dengan "Kuota terpakai" di dashboard (terbit
          // + pending) dan kolom Sisa di fitur tiket.
          supabaseAdmin
            .from('orders')
            .select('id')
            .in('status', ['DRAFT', 'PENDING_PAYMENT', 'WAITING_VERIFICATION']),
        ])
        if (issuedRes.error) throw new Error(issuedRes.error.message)
        if (newOrdersRes.error) throw new Error(newOrdersRes.error.message)
        for (const row of issuedRes.data ?? []) {
          issuedCounts[row.ticket_type_id] = (issuedCounts[row.ticket_type_id] ?? 0) + 1
        }
        const newOrderIds = (newOrdersRes.data ?? []).map((o: any) => o.id)
        if (newOrderIds.length) {
          const { data: pendingItems, error: pendingError } = await supabaseAdmin
            .from('order_items')
            .select('ticket_type_id')
            .in('order_id', newOrderIds)
            .in('ticket_type_id', ticketIds)
          if (pendingError) throw new Error(pendingError.message)
          // "Pending" = tiket dari pesanan yang belum di-approve dan pesanan baru.
          for (const row of pendingItems ?? []) {
            pendingCounts[row.ticket_type_id] = (pendingCounts[row.ticket_type_id] ?? 0) + 1
          }
        }
      }

      activeTickets = {
        total: (tickets ?? []).length,
        items: (tickets ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          ticketType: t.ticket_type,
          quota: t.quota,
          status: t.status,
          finalPrice: t.final_price,
          issued: issuedCounts[t.id] ?? 0,
          pending: pendingCounts[t.id] ?? 0,
          remaining: Math.max(0, Number(t.quota) - (issuedCounts[t.id] ?? 0)),
        })),
      }

      // ── Kode referal aktif (super admin saja) ────────────────────────
      if (isSuperAdmin) {
        const { data: referrals, error: referralsError } = await supabaseAdmin
          .from('referral_codes')
          .select('id, code, discount_type, discount_value, max_discount, usage_limit, status')
          .eq('event_id', activeEvent.id)
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: true })

        if (referralsError) throw new Error(referralsError.message)

        const referralIds = (referrals ?? []).map((r: any) => r.id)
        const usedCounts: Record<string, number> = {}
        if (referralIds.length) {
          const { data: redemptions, error: redemptionsError } = await supabaseAdmin
            .from('referral_redemptions')
            .select('referral_code_id')
            .in('referral_code_id', referralIds)
            .in('status', ['RESERVED', 'CONSUMED'])
          if (redemptionsError) throw new Error(redemptionsError.message)
          for (const row of redemptions ?? []) {
            usedCounts[row.referral_code_id] = (usedCounts[row.referral_code_id] ?? 0) + 1
          }
        }

        activeReferrals = {
          total: (referrals ?? []).length,
          items: (referrals ?? []).map((r: any) => ({
            id: r.id,
            code: r.code,
            discountType: r.discount_type,
            discountValue: r.discount_value,
            maxDiscount: r.max_discount,
            usageLimit: r.usage_limit,
            usedCount: usedCounts[r.id] ?? 0,
          })),
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
        activeTickets,
        activeReferrals,
      },
    })
  } catch (error) {
    console.error('Admin dashboard summary error:', error)
    return jsonError('Gagal mengambil ringkasan dashboard.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetDashboardSummary)