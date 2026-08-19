import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

// "Total Pesanan" = gabungan tiket yang belum di-approve (WAITING_VERIFICATION)
// dan tiket yang telah terbit (TICKET_ISSUED).
const TOTAL_ORDER_STATUSES = ['WAITING_VERIFICATION', 'TICKET_ISSUED']
// "Pesanan Disetujui" hanya diambil dari status APPROVED.
const APPROVED_STATUSES = ['APPROVED']
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
    const [totalOrdersQuery, pendingQuery, approvedQuery, newOrdersQuery, revenueQuery] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', TOTAL_ORDER_STATUSES),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'WAITING_VERIFICATION'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', APPROVED_STATUSES),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', NEW_ORDER_STATUSES),
      supabase.from('orders').select('total_amount').in('status', REVENUE_STATUSES),
    ])

    if (totalOrdersQuery.error) throw new Error(totalOrdersQuery.error.message)
    if (pendingQuery.error) throw new Error(pendingQuery.error.message)
    if (approvedQuery.error) throw new Error(approvedQuery.error.message)
    if (newOrdersQuery.error) throw new Error(newOrdersQuery.error.message)
    if (revenueQuery.error) throw new Error(revenueQuery.error.message)

    const totalRevenue = (revenueQuery.data ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.total_amount || 0),
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: totalOrdersQuery.count ?? 0,
        pendingVerification: pendingQuery.count ?? 0,
        approvedOrders: approvedQuery.count ?? 0,
        newOrders: newOrdersQuery.count ?? 0,
      },
    })
  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return jsonError('Gagal mengambil statistik dashboard.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetDashboardStats)
