import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    // Dapatkan event aktif
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, zoom_enabled, zoom_meeting_link, zoom_link_updated_at, zoom_session_token, zoom_session_expires_at, zoom_live_tracking_enabled')
      .order('event_date', { ascending: false })
      .limit(1)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const sessionActive = !!(
      event.zoom_session_token &&
      event.zoom_session_expires_at &&
      new Date(event.zoom_session_expires_at) > new Date()
    );

    // Ambil agregasi status tiket untuk event ini
    // Membutuhkan join melalui orders, atau asumsi kita menghitung semua tiket
    const { data: statsData, error: statsError } = await supabase
      .from('issued_tickets')
      .select('zoom_status')
      .not('zoom_token', 'is', null);

    let stats = {
      totalWithZoomAccess: 0,
      totalUsed: 0,
      totalPending: 0,
      totalExpired: 0,
    };

    if (statsData) {
      stats.totalWithZoomAccess = statsData.length;
      stats.totalUsed = statsData.filter(t => t.zoom_status === 'USED').length;
      stats.totalPending = statsData.filter(t => t.zoom_status === 'PENDING').length;
      stats.totalExpired = statsData.filter(t => t.zoom_status === 'EXPIRED').length;
    }

    // Selalu ambil recent access — toggle hanya mengontrol auto-refresh di frontend
    const { data: recentAccessData, error: recentErr } = await supabase
      .from('issued_tickets')
      .select(`
        zoom_used_at,
        ticket_code,
        order_items (
          participants ( full_name ),
          ticket_types ( name )
        )
      `)
      .eq('zoom_status', 'USED')
      .order('zoom_used_at', { ascending: false })
      .limit(20);

    if (recentErr) {
      console.error('[zoom-dashboard] recentAccess query error:', recentErr.message);
    }

    const recentAccess = (recentAccessData || []).map(item => {
      const orderItem = (item as any).order_items;
      return {
        participantName: orderItem?.participants?.full_name || 'Unknown',
        ticketCode: item.ticket_code,
        ticketTypeName: orderItem?.ticket_types?.name || 'Unknown',
        accessedAt: item.zoom_used_at,
      };
    });

    let qrCodeDataUrl = null;
    if (sessionActive && event.zoom_session_token) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const qrUrl = `${APP_URL}/zoom/join?s=${event.zoom_session_token}`;
      qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        zoomEnabled: event.zoom_enabled,
        zoomMeetingLink: event.zoom_meeting_link,
        zoomLinkReady: !!event.zoom_meeting_link,
        zoomLinkUpdatedAt: event.zoom_link_updated_at,
        sessionActive,
        sessionExpiresAt: event.zoom_session_expires_at,
        qrCodeDataUrl,
        zoomLiveTrackingEnabled: event.zoom_live_tracking_enabled,
        stats,
        recentAccess
      }
    });

  } catch (error) {
    console.error("admin-zoom-dashboard error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
