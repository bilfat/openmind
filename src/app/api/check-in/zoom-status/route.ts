import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    // Dapatkan event aktif (yang paling baru/mendatang)
    const { data: event, error } = await supabase
      .from('events')
      .select('name, zoom_enabled, zoom_meeting_link')
      .order('event_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !event) {
      return NextResponse.json({ success: true, data: { zoomEnabled: false } });
    }

    return NextResponse.json({
      success: true,
      data: {
        eventName: event.name,
        zoomEnabled: event.zoom_enabled,
        zoomReady: !!event.zoom_meeting_link,
      }
    });

  } catch (error) {
    console.error("zoom-status error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
