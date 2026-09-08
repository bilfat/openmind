import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Converts a standard Zoom HTTPS URL to a zoommtg:// deep link
 * Input:  https://us06web.zoom.us/j/84364213923?pwd=c6d0ONe8bJg...
 * Output: zoommtg://zoom.us/join?confno=84364213923&pwd=c6d0ONe8bJg...
 */
function buildZoomDeepLink(zoomUrl: string): string {
  try {
    const url = new URL(zoomUrl);
    // Extract meeting ID from path: /j/123456789
    const meetingId = url.pathname.split('/j/')[1]?.split('/')[0];
    const pwd = url.searchParams.get('pwd') || '';

    if (!meetingId) return zoomUrl; // fallback to https if can't parse

    // Use zoomus:// scheme which is supported by Zoom App on iOS, Android, and Desktop
    // (zoommtg:// is desktop-only and causes "Safari tidak dapat membuka halaman karena alamatnya tidak sah" on iOS)
    let deepLink = `zoomus://zoom.us/join?confno=${meetingId}`;
    if (pwd) deepLink += `&pwd=${encodeURIComponent(pwd)}`;

    return deepLink;
  } catch {
    return zoomUrl; // fallback to original https url
  }
}

export async function POST(request: Request) {
  try {
    const { zoomToken, sessionToken } = await request.json();

    if (!zoomToken || !zoomToken.startsWith('zm:')) {
      return NextResponse.json({ success: false, reason: 'invalid_token', message: 'Token tidak valid' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Dapatkan Issued Ticket dan Event
    const { data: ticket, error: ticketError } = await supabase
      .from('issued_tickets')
      .select('id, zoom_status, status, ticket_types(zoom_enabled), orders(event_id)')
      .eq('zoom_token', zoomToken)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, reason: 'invalid_token', message: 'Token tidak valid' }, { status: 400 });
    }

    // 2. Cek status tiket
    if (ticket.status !== 'ACTIVE' && ticket.status !== 'CHECKED_IN') {
      return NextResponse.json({ success: false, reason: 'ticket_inactive', message: 'Tiket tidak aktif' }, { status: 403 });
    }

    // 3. Cek zoom_status
    if (ticket.zoom_status === 'USED') {
      return NextResponse.json({ success: false, reason: 'already_used', message: 'Token sudah dipakai. Hubungi panitia jika kelempar dari Zoom.' }, { status: 403 });
    }
    if (ticket.zoom_status === 'EXPIRED') {
      return NextResponse.json({ success: false, reason: 'expired', message: 'Token expired' }, { status: 403 });
    }

    // @ts-ignore
    const eventId = ticket.orders?.event_id;
    if (!eventId) {
       return NextResponse.json({ success: false, reason: 'error', message: 'Event not found' }, { status: 500 });
    }

    // 4. Dapatkan zoom info dari Event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('zoom_meeting_link, zoom_session_token, zoom_session_expires_at')
      .eq('id', eventId)
      .single();

    if (eventError || !event || !event.zoom_meeting_link) {
      return NextResponse.json({ success: false, reason: 'link_not_ready', message: 'Zoom link belum siap' }, { status: 403 });
    }

    // 5. Jika sessionToken dikirimkan, validasi session
    if (sessionToken) {
      if (!sessionToken.startsWith('zs:')) {
        return NextResponse.json({ success: false, reason: 'invalid_session', message: 'Session QR tidak valid' }, { status: 400 });
      }
      if (sessionToken !== event.zoom_session_token) {
        return NextResponse.json({ success: false, reason: 'invalid_session', message: 'Session QR salah' }, { status: 400 });
      }
      if (event.zoom_session_expires_at && new Date(event.zoom_session_expires_at) < new Date()) {
        return NextResponse.json({ success: false, reason: 'session_expired', message: 'Session QR sudah kadaluarsa' }, { status: 403 });
      }
    }

    // 6. Optimistic Lock UPDATE (Hanya update jika status masih PENDING)
    const { data: updatedTicket, error: updateError } = await supabase
      .from('issued_tickets')
      .update({ zoom_status: 'USED', zoom_used_at: new Date().toISOString() })
      .eq('id', ticket.id)
      .eq('zoom_status', 'PENDING') // Optimistic lock
      .select('id')
      .single();

    if (updateError || !updatedTicket) {
      return NextResponse.json({ success: false, reason: 'already_used', message: 'Token sudah dipakai' }, { status: 403 });
    }

    // 7. Bangun deep link zoommtg:// agar tidak terlihat URL Zoom aslinya
    const deepLink = buildZoomDeepLink(event.zoom_meeting_link);

    return NextResponse.json({ 
      success: true, 
      data: { 
        deepLink,
        // Sertakan https link sebagai fallback di client jika zoommtg tidak tersedia
        fallbackUrl: event.zoom_meeting_link 
      } 
    });

  } catch (error) {
    console.error("verify-zoom-token error:", error);
    return NextResponse.json({ success: false, reason: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
