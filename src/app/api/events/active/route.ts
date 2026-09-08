import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeoutGuard } from '@/lib/timeout'

async function handleGetActiveEvent() {
  try {
    const supabase = createAdminClient()

    // Fetch active event
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch active event: ${error.message}`)
    }

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event aktif tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Fetch visible speakers & agenda for the active event in parallel
    const [speakersResult, agendaResult] = await Promise.all([
      supabase
        .from('event_speakers')
        .select('*')
        .eq('event_id', event.id)
        .eq('is_visible', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('event_agenda')
        .select('*')
        .eq('event_id', event.id)
        .eq('is_visible', true)
        .order('session_order', { ascending: true }),
    ])

    if (speakersResult.error) {
      throw new Error(`Failed to fetch speakers: ${speakersResult.error.message}`)
    }
    if (agendaResult.error) {
      throw new Error(`Failed to fetch agenda: ${agendaResult.error.message}`)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          event,
          speakers: speakersResult.data ?? [],
          agenda: agendaResult.data ?? [],
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const GET = withTimeoutGuard(handleGetActiveEvent, 12000)

