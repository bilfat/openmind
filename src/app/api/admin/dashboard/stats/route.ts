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

    // Jumlah tiket (item pesanan) dari order yang belum di-approve, bukan jumlah
    // order. Filter embed `orders.status` pada order_items tidak andal, jadi
    // ambil ID order WAITING_VERIFICATION dulu lalu hitung item-nya.
    const { data: pendingOrderRows, error: pendingOrderErr } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'WAITING_VERIFICATION')
    if (pendingOrderErr) throw new Error(pendingOrderErr.message)
    const pendingOrderIds = (pendingOrderRows ?? []).map((o: any) => o.id)
    let pendingTickets = 0
    if (pendingOrderIds.length) {
      const { count, error } = await supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .in('order_id', pendingOrderIds)
      if (error) throw new Error(error.message)
      pendingTickets = count ?? 0
    }

    // Rincian revenue per jenis tiket & harga (tiket terbit + tiket pending).
    // Dikelompokkan berdasarkan nama tiket + harga aktual dari order_items,
    // karena harga walk-in bisa berbeda (mis. Rp 38.000) tanpa label sumber.
    const { data: revIssuedRows, error: revIssuedErr } = await supabase
      .from('issued_tickets')
      .select('order_items(line_total), ticket_types(name)')
      .neq('status', 'CANCELLED')
    if (revIssuedErr) throw new Error(revIssuedErr.message)

    let revPendingRows: any[] = []
    if (pendingOrderIds.length) {
      const { data, error } = await supabase
        .from('order_items')
        .select('line_total, ticket_types(name)')
        .in('order_id', pendingOrderIds)
      if (error) throw new Error(error.message)
      revPendingRows = data ?? []
    }

    const buildBreakdown = (rows: any[], getPrice: (row: any) => number) => {
      const map = new Map<string, { ticket_name: string; price: number; count: number }>()
      for (const row of rows) {
        const t = Array.isArray(row.ticket_types) ? row.ticket_types[0] : row.ticket_types
        const price = getPrice(row)
        const key = `${t?.name ?? '-'}|${price}`
        const cur = map.get(key) ?? { ticket_name: t?.name ?? '-', price, count: 0 }
        cur.count += 1
        map.set(key, cur)
      }
      return [...map.values()]
        .map((r) => ({ ...r, total: r.count * r.price }))
        .sort((a, b) => b.price - a.price)
    }

    const revenueBreakdown = {
      issued: buildBreakdown(revIssuedRows ?? [], (row: any) =>
        Number((Array.isArray(row.order_items) ? row.order_items[0] : row.order_items)?.line_total ?? 0)
      ),
      pending: buildBreakdown(revPendingRows, (row: any) => Number(row.line_total ?? 0)),
    }

    // Order yang membeli lebih dari 1 tiket (multi pax) untuk detail dashboard.
    const { data: issuedRows, error: issuedRowsError } = await supabase
      .from('issued_tickets')
      .select('order_id, ticket_code, participants(full_name, nim, email, whatsapp, faculty), ticket_types(name, code, ticket_type)')
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
            ticket_type: t?.ticket_type ?? '-',
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
        pendingTickets,
        issuedOrders: issuedTicketQuery.count ?? 0,
        issuedTicketOrders: issuedOrderQuery.count ?? 0,
        newOrders: newOrdersQuery.count ?? 0,
        multiPaxOrders,
        revenueBreakdown,
      },
    })
  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return jsonError('Gagal mengambil statistik dashboard.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetDashboardStats)
