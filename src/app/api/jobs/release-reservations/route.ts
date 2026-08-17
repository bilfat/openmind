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

    // 2. Query and update expired reservations atomically
    const { data, error } = await supabase
      .from('ticket_reservations')
      .update({
        status: 'EXPIRED',
        released_at: now
      })
      .eq('status', 'RESERVED')
      .lt('reserved_until', now)
      .select()

    if (error) {
      throw new Error(`Failed to release expired reservations: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses pembebasan kuota. Total dilepas: ${data?.length || 0} reservasi.`,
      released_count: data?.length || 0,
      data
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
