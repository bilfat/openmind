import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    // Dapatkan event aktif (yang paling baru/mendatang)
    const { data: event, error } = await supabase
      .from('events')
      .select('name, zoom_enabled, zoom_meeting_link, zoom_session_token, zoom_session_expires_at')
      .order('event_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !event) {
      return NextResponse.json({ success: true, data: { zoomEnabled: false } });
    }

    const sessionActive = !!(
      event.zoom_session_token &&
      event.zoom_session_expires_at &&
      new Date(event.zoom_session_expires_at) > new Date()
    );

    return NextResponse.json({
      success: true,
      data: {
        eventName: event.name,
        zoomEnabled: event.zoom_enabled,
        zoomReady: !!event.zoom_meeting_link,
        sessionActive,
      }
    });

  } catch (error) {
    console.error("zoom-status error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
