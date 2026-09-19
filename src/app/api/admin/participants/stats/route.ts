import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

async function handleGetParticipantStats() {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  try {
    const { supabase } = auth

    // 1. Get ticket types to differentiate between Online (zoom_enabled) and Offline
    const { data: ticketTypes, error: ttError } = await supabase
      .from('ticket_types')
      .select('id, zoom_enabled')

    if (ttError) throw new Error(ttError.message)

    const onlineTypeIds = (ticketTypes ?? []).filter((t) => t.zoom_enabled).map((t) => t.id)
    const offlineTypeIds = (ticketTypes ?? []).filter((t) => !t.zoom_enabled).map((t) => t.id)

    // 2. Perform exact count queries per issued ticket (not capped by row limit)
    const [
      offlineTotalRes,
      offlineCheckedInRes,
      onlineTotalRes,
      onlineCheckedInRes,
    ] = await Promise.all([
      // Total Tiket Terbit Offline (ACTIVE & CHECKED_IN)
      offlineTypeIds.length > 0
        ? supabase
            .from('issued_tickets')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'CANCELLED')
            .in('ticket_type_id', offlineTypeIds)
        : Promise.resolve({ count: 0, error: null }),

      // Hadir Offline (CHECKED_IN)
      offlineTypeIds.length > 0
        ? supabase
            .from('issued_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'CHECKED_IN')
            .in('ticket_type_id', offlineTypeIds)
        : Promise.resolve({ count: 0, error: null }),

      // Total Tiket Terbit Online (ACTIVE & CHECKED_IN)
      onlineTypeIds.length > 0
        ? supabase
            .from('issued_tickets')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'CANCELLED')
            .in('ticket_type_id', onlineTypeIds)
        : Promise.resolve({ count: 0, error: null }),

      // Hadir Online (CHECKED_IN)
      onlineTypeIds.length > 0
        ? supabase
            .from('issued_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'CHECKED_IN')
            .in('ticket_type_id', onlineTypeIds)
        : Promise.resolve({ count: 0, error: null }),
    ])

    if (offlineTotalRes.error) throw new Error(offlineTotalRes.error.message)
    if (offlineCheckedInRes.error) throw new Error(offlineCheckedInRes.error.message)
    if (onlineTotalRes.error) throw new Error(onlineTotalRes.error.message)
    if (onlineCheckedInRes.error) throw new Error(onlineCheckedInRes.error.message)

    const offlineTotal = offlineTotalRes.count ?? 0
    const offlineCheckedIn = offlineCheckedInRes.count ?? 0
    const onlineTotal = onlineTotalRes.count ?? 0
    const onlineCheckedIn = onlineCheckedInRes.count ?? 0

    const totalAll = offlineTotal + onlineTotal
    const checkedInAll = offlineCheckedIn + onlineCheckedIn

    return NextResponse.json({
      success: true,
      data: {
        total: totalAll,
        checkedIn: checkedInAll,
        notCheckedIn: totalAll - checkedInAll,
        offline: {
          total: offlineTotal,
          checkedIn: offlineCheckedIn,
          notCheckedIn: offlineTotal - offlineCheckedIn,
        },
        online: {
          total: onlineTotal,
          checkedIn: onlineCheckedIn,
          notCheckedIn: onlineTotal - onlineCheckedIn,
        },
      },
    })
  } catch (error) {
    console.error('Admin participant stats error:', error)
    return jsonError('Gagal mengambil statistik peserta.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetParticipantStats)
