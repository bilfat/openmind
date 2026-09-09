import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';
import QRCode from 'qrcode';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expiresInHours = parseInt(body.expiresInHours) || 12;

    const supabase = createAdminClient();

    // Dapatkan event aktif
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id, zoom_enabled, zoom_meeting_link')
      .order('event_date', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    if (!event.zoom_enabled || !event.zoom_meeting_link) {
      return NextResponse.json({ 
        success: false, 
        message: 'Akses Zoom harus diaktifkan dan link Zoom harus diisi terlebih dahulu.' 
      }, { status: 400 });
    }

    const zoom_session_token = `zs:${crypto.randomUUID()}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    const zoom_session_expires_at = expiresAt.toISOString();

    const { error: updateError } = await supabase
      .from('events')
      .update({
        zoom_session_token,
        zoom_session_expires_at
      })
      .eq('id', event.id);

    if (updateError) throw updateError;

    // Generate QR Code Image
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const joinUrl = `${baseUrl}/zoom/join?s=${zoom_session_token}`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        qrCodeDataUrl,
        sessionExpiresAt: zoom_session_expires_at,
        joinUrl
      }
    });

  } catch (error) {
    console.error("admin-zoom-generate-session error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
