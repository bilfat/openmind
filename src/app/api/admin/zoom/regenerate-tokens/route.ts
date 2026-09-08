import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();

    // Query issued tickets WHERE zoom_status = 'PENDING'
    // Update zoom_token with a new random string
    // Note: gen_random_uuid() is used at DB level, but we can do it via JS or raw SQL.
    // For supabase JS client, we need to select them first then update them, or use an RPC.
    // Assuming we do it locally since it's a batch update.
    
    const { data: tickets, error: fetchError } = await supabase
      .from('issued_tickets')
      .select('id')
      .eq('zoom_status', 'PENDING');

    if (fetchError) {
      throw fetchError;
    }

    if (!tickets || tickets.length === 0) {
       return NextResponse.json({ success: true, message: 'Tokens regenerated', regeneratedCount: 0 });
    }

    let regeneratedCount = 0;
    
    // Batch update (if there are many, we should use RPC. For this implementation, loop is used for simplicity)
    for (const ticket of tickets) {
      const zoom_token = `zm:${crypto.randomUUID()}`;
      await supabase
        .from('issued_tickets')
        .update({ zoom_token })
        .eq('id', ticket.id);
      regeneratedCount++;
    }

    return NextResponse.json({ success: true, message: 'Tokens regenerated', regeneratedCount });

  } catch (error) {
    console.error("admin-zoom-regenerate error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
