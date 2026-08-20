import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

// "Total Pesanan" = gabungan tiket yang belum di-approve (WAITING_VERIFICATION)
// dan tiket yang telah terbit (TICKET_ISSUED).
const TOTAL_ORDER_STATUSES = ['WAITING_VERIFICATION', 'TICKET_ISSUED']
// "Tiket Telah Terbit" dihitung per tiket terbit (issued_tickets), bukan per
// order — konsisten dengan halaman tiket karena 1 order bisa berisi >1 pax.
const ISSUED_STATUSES = ['TICKET_ISSUED']
// "Total Revenue" diambil dari tiket belum di-approve, tiket disetujui, dan
// tiket yang telah terbit.
const REVENUE_STATUSES = ['APPROVED', 'TICKET_ISSUED', 'WAITING_VERIFICATION']
// "Pesanan Baru" = pesanan yang masih menunggu upload bukti pembayaran.
// Pada alur baru pesanan dibuat berstatus DRAFT; PENDING_PAYMENT adalah status lama.
const NEW_ORDER_STATUSES = ['DRAFT', 'PENDING_PAYMENT']

async function handleGetDashboardStats() {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { supabase } = auth

  try {
    const [totalOrdersQuery, pendingQuery, issuedTicketQuery, issuedOrderQuery, newOrdersQuery, revenueQuery] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', TOTAL_ORDER_STATUSES),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'WAITING_VERIFICATION'),
      supabase
        .from('issued_tickets')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'CANCELLED'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ISSUED_STATUSES),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', NEW_ORDER_STATUSES),
      supabase.from('orders').select('total_amount').in('status', REVENUE_STATUSES),
    ])

    if (totalOrdersQuery.error) throw new Error(totalOrdersQuery.error.message)
    if (pendingQuery.error) throw new Error(pendingQuery.error.message)
    if (issuedTicketQuery.error) throw new Error(issuedTicketQuery.error.message)
    if (issuedOrderQuery.error) throw new Error(issuedOrderQuery.error.message)
    if (newOrdersQuery.error) throw new Error(newOrdersQuery.error.message)
    if (revenueQuery.error) throw new Error(revenueQuery.error.message)

    const totalRevenue = (revenueQuery.data ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.total_amount || 0),
      0
    )

    // Order yang membeli lebih dari 1 tiket (multi pax) untuk detail dashboard.
    const { data: issuedRows, error: issuedRowsError } = await supabase
      .from('issued_tickets')
      .select('order_id, ticket_code, participants(full_name, nim, email, whatsapp, faculty), ticket_types(name)')
      .neq('status', 'CANCELLED')
    if (issuedRowsError) throw new Error(issuedRowsError.message)

    const perOrderMap = new Map<string, any[]>()
    for (const row of issuedRows ?? []) {
      const list = perOrderMap.get(row.order_id) ?? []
      list.push(row)
      perOrderMap.set(row.order_id, list)
    }
    const multiPax = [...perOrderMap.entries()].filter(([, rows]) => rows.length > 1)
    let multiPaxOrders: any[] = []
    if (multiPax.length) {
      const multiOrderIds = multiPax.map(([oid]) => oid)
      const { data: multiOrders, error: multiOrdersError } = await supabase
        .from('orders')
        .select('id, order_code, created_at')
        .in('id', multiOrderIds)
      if (multiOrdersError) throw new Error(multiOrdersError.message)
      const orderMap = new Map((multiOrders ?? []).map((o: any) => [o.id, o]))
      multiPaxOrders = multiPax.map(([oid, rows]) => ({
        order_id: oid,
        order_code: orderMap.get(oid)?.order_code ?? '-',
        created_at: orderMap.get(oid)?.created_at ?? null,
        ticketCount: rows.length,
        items: rows.map((r: any) => {
          const p = Array.isArray(r.participants) ? r.participants[0] : r.participants
          const t = Array.isArray(r.ticket_types) ? r.ticket_types[0] : r.ticket_types
          return {
            ticket_code: r.ticket_code,
            full_name: p?.full_name ?? '-',
            nim: p?.nim ?? '-',
            email: p?.email ?? '-',
            whatsapp: p?.whatsapp ?? '-',
            faculty: p?.faculty ?? '-',
            ticket_name: t?.name ?? '-',
          }
        }),
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: totalOrdersQuery.count ?? 0,
        pendingVerification: pendingQuery.count ?? 0,
        issuedOrders: issuedTicketQuery.count ?? 0,
        issuedTicketOrders: issuedOrderQuery.count ?? 0,
        newOrders: newOrdersQuery.count ?? 0,
        multiPaxOrders,
      },
    })
  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return jsonError('Gagal mengambil statistik dashboard.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetDashboardStats)
