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

    return NextResponse.json({
      success: true,
      data: event
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
