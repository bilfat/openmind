import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketCode } = body;

    if (!ticketCode) {
      return NextResponse.json({ success: false, message: 'ticketCode diperlukan' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Reset zoom_status ke PENDING menggunakan admin client
    const { data, error } = await supabase
      .from('issued_tickets')
      .update({ 
        zoom_status: 'PENDING', 
        zoom_used_at: null 
      })
      .eq('ticket_code', ticketCode)
      .eq('zoom_status', 'USED') // Hanya reset yang statusnya USED
      .select('id, ticket_code')
      .single();

    if (error) {
      console.error('[reset-zoom-token] DB error:', error.message, error.details);
      return NextResponse.json({ 
        success: false, 
        message: 'Gagal mereset token: ' + error.message
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        message: 'Tiket tidak ditemukan atau statusnya bukan USED' 
      }, { status: 404 });
    }

    console.log(`[AUDIT] Reset zoom token for ticket: ${ticketCode}`);

    return NextResponse.json({ 
      success: true, 
      message: `Token untuk tiket ${ticketCode} berhasil di-reset. Peserta dapat join kembali.` 
    });

  } catch (error) {
    console.error("reset-zoom-token error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
