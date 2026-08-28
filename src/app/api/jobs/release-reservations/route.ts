import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function isAuthorizedRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  
  // Extract query parameters
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')

  // Retrieve secret from env or fall back to default for development
  const cronSecret = process.env.CRON_SECRET || 'super-secret-cron-key-2026'

  return (
    authHeader === `Bearer ${cronSecret}` ||
    querySecret === cronSecret
  )
}

export async function GET(request: Request) {
  try {
    // 1. Enforce protection
    if (!isAuthorizedRequest(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid or missing authorization secret.' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Primary: panggil cleanup_expired_orders_rpc (canonical) yang mengexpire
    // reservasi kedaluwarsa DAN order DRAFT/PENDING_PAYMENT yang melewati
    // jendela pembayaran (30 menit), sehingga tiket pending tidak lagi menahan
    // kuota. Referal yang ditahan ikut dilepas.
    const { data, error } = await supabase.rpc('cleanup_expired_orders_rpc', { p_stale_minutes: 30 })

    if (!error) {
      const summary = (data ?? {}) as Record<string, unknown>
      return NextResponse.json({
        success: true,
        message: 'Berhasil memproses pembebasan kuota dan kedaluwarsa pesanan.',
        released_count: Number(summary.expiredReservations ?? 0),
        expired_orders: Number(summary.expiredOrders ?? 0),
        released_redemptions: Number(summary.releasedRedemptions ?? 0),
        data: summary,
      })
    }

    // Fallback (legacy): hanya menandai reservasi yang kedaluwarsa.
    const { data: legacyData, error: legacyError } = await supabase
      .from('ticket_reservations')
      .update({
        status: 'EXPIRED',
        released_at: now
      })
      .eq('status', 'RESERVED')
      .lt('reserved_until', now)
      .select()

    if (legacyError) {
      throw new Error(`Failed to release expired reservations: ${legacyError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses pembebasan kuota. Total dilepas: ${legacyData?.length || 0} reservasi.`,
      released_count: legacyData?.length || 0,
      data: legacyData
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
