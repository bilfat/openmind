import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()

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

    // Fetch visible speakers & agenda for the active event
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

    return NextResponse.json({
      success: true,
      data: {
        event,
        speakers: speakersResult.data ?? [],
        agenda: agendaResult.data ?? [],
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
