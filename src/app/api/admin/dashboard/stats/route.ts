import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

const APPROVED_STATUSES = ['APPROVED', 'TICKET_ISSUED']
const REVENUE_STATUSES = ['APPROVED', 'TICKET_ISSUED', 'WAITING_VERIFICATION']

async function handleGetDashboardStats() {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { supabase } = auth

  try {
    const [totalOrdersQuery, pendingQuery, approvedQuery, revenueQuery] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'WAITING_VERIFICATION'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', APPROVED_STATUSES),
      supabase.from('orders').select('total_amount').in('status', REVENUE_STATUSES),
    ])

    if (totalOrdersQuery.error) throw new Error(totalOrdersQuery.error.message)
    if (pendingQuery.error) throw new Error(pendingQuery.error.message)
    if (approvedQuery.error) throw new Error(approvedQuery.error.message)
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
      },
    })
  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return jsonError('Gagal mengambil statistik dashboard.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetDashboardStats)
