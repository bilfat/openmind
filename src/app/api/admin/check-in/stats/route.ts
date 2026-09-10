import { requireActiveOperator, jsonError } from '@/lib/admin-read-auth'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const secretKey = process.env.SUPABASE_SECRET_KEY!
  return createClient(url, secretKey, { auth: { persistSession: false } })
}

export async function GET() {
  const authResult = await requireActiveOperator()
  if (!authResult.authorized) {
    return jsonError(authResult.message, authResult.status)
  }

  const supabaseAdmin = getAdminClient()

  // Get active event
  const { data: activeEvent } = await supabaseAdmin
    .from('events')
    .select('id, name')
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (!activeEvent) {
    return Response.json(
      {
        success: true,
        data: {
          totalIssued: 0,
          totalCheckedIn: 0,
          attendanceRate: 0,
        },
      },
      { status: 200 }
    )
  }

  // Count total issued tickets (ACTIVE or CHECKED_IN)
  const { count: totalIssued } = await supabaseAdmin
    .from('issued_tickets')
    .select('id', { count: 'exact', head: true })
    .in('status', ['ACTIVE', 'CHECKED_IN'])

  // Count total check-ins from issued_tickets (status CHECKED_IN covers both offline scan & online Zoom join)
  const { count: totalCheckedIn } = await supabaseAdmin
    .from('issued_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'CHECKED_IN')

  const issued = totalIssued || 0
  const checkedIn = totalCheckedIn || 0
  const rawRate = issued > 0 ? (checkedIn / issued) * 100 : 0
  const attendanceRate = rawRate > 0 && rawRate < 1 ? Number(rawRate.toFixed(1)) : Math.round(rawRate)

  return Response.json(
    {
      success: true,
      data: {
        totalIssued: issued,
        totalCheckedIn: checkedIn,
        attendanceRate,
      },
    },
    { status: 200 }
  )
}
