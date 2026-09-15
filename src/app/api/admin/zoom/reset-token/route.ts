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
      .select('id, ticket_code')
      .single();

    if (error || !data) {
      console.error('[reset-zoom-token] DB error:', error?.message);
      return NextResponse.json({ 
        success: false, 
        message: 'Gagal mereset token: ' + (error?.message || 'Tiket tidak ditemukan')
      }, { status: 500 });
    }

    // Hapus rekaman ZOOM_JOIN di check_ins agar jatah 5x Re-Join kembali ke 0
    try {
      await supabase
        .from('check_ins')
        .delete()
        .eq('issued_ticket_id', data.id)
        .eq('method', 'ZOOM_JOIN');
    } catch (cleanErr) {
      console.error('[reset-zoom-token] Failed to clear check_ins:', cleanErr);
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
