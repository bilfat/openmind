import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { zoomMeetingLink, zoomEnabled, zoomLiveTrackingEnabled } = body;

    const supabase = createAdminClient();

    // Validasi URL
    if (zoomMeetingLink !== undefined && zoomMeetingLink !== null && zoomMeetingLink !== "") {
      if (!/^https:\/\/([\w-]+\.)?zoom\.us\//.test(zoomMeetingLink)) {
         return NextResponse.json({ success: false, message: 'URL Zoom tidak valid.' }, { status: 400 });
      }
      if (zoomMeetingLink.length > 500) {
        return NextResponse.json({ success: false, message: 'URL Zoom terlalu panjang.' }, { status: 400 });
      }
    }

    const updates: any = {};

    if (zoomMeetingLink !== undefined) {
      updates.zoom_link_updated_at = new Date().toISOString();
      updates.zoom_meeting_link = zoomMeetingLink;
      if (!zoomMeetingLink) {
        updates.zoom_session_token = null;
        updates.zoom_session_expires_at = null;
      }
    }
    if (zoomEnabled !== undefined) {
      updates.zoom_enabled = zoomEnabled;
      if (!zoomEnabled) {
        updates.zoom_session_token = null;
        updates.zoom_session_expires_at = null;
      }
    }
    if (zoomLiveTrackingEnabled !== undefined) {
      updates.zoom_live_tracking_enabled = zoomLiveTrackingEnabled;
    }

    // Update event aktif
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .order('event_date', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('events')
      .update(updates)
      .eq('id', event.id);

    if (updateError) throw updateError;

    // TODO: Write Audit Log (skip for now as we don't have the implementation details of writeAuditLog)
    
    return NextResponse.json({ success: true, message: 'Zoom link updated', updatedAt: updates.zoom_link_updated_at });

  } catch (error) {
    console.error("admin-zoom-change-link error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
