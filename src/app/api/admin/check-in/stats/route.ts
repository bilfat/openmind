import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const secretKey = process.env.SUPABASE_SECRET_KEY!
  return createClient(url, secretKey, { auth: { persistSession: false } })
}

export async function GET() {
  const authResult = await requireActiveAdmin()
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

  // Count total check-ins
  const { count: totalCheckedIn } = await supabaseAdmin
    .from('check_ins')
    .select('id', { count: 'exact', head: true })

  const issued = totalIssued || 0
  const checkedIn = totalCheckedIn || 0
  const attendanceRate = issued > 0 ? Math.round((checkedIn / issued) * 100) : 0

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
