import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, status: 401, message: 'Unauthorized: Sesi tidak ditemukan.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'ACTIVE') {
    return { authorized: false, status: 401, message: 'Unauthorized: Akun tidak aktif.' }
  }

  if (profile.role !== 'SUPER_ADMIN') {
    return { authorized: false, status: 403, message: 'Forbidden: Hanya Super Admin yang dapat mengakses.' }
  }

  return { authorized: true, supabase }
}

function generatePrivateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// GET /api/admin/tickets - List all tickets for the active event
export async function GET() {
  const auth = await checkSuperAdmin()
  const supabase = auth.supabase

  if (!auth.authorized || !supabase) {
    return NextResponse.json({ success: false, message: auth.message || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    // Get active event ID
    const { data: activeEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (eventError || !activeEvent) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { data: tickets, error: ticketError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', activeEvent.id)
      .order('created_at', { ascending: false })

    if (ticketError) {
      throw new Error(ticketError.message)
    }

    const now = new Date().toISOString()
    const processedTickets = []

    for (const ticket of tickets) {
      // Count active issued tickets
      const { count: issuedCount, error: issuedError } = await supabase
        .from('issued_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type_id', ticket.id)
        .neq('status', 'CANCELLED')

      if (issuedError) {
        throw new Error(`Failed to calculate issued count: ${issuedError.message}`)
      }

      // Sum active reservations
      const { data: reservations, error: resError } = await supabase
        .from('ticket_reservations')
        .select('quantity')
        .eq('ticket_type_id', ticket.id)
        .eq('status', 'RESERVED')
        .gt('reserved_until', now)

      if (resError) {
        throw new Error(`Failed to fetch reservations: ${resError.message}`)
      }

      const reservedCount = reservations.reduce((acc, curr) => acc + (curr.quantity || 0), 0)

      const totalUsed = (issuedCount || 0) + reservedCount
      const remainingQuota = Math.max(0, ticket.quota - totalUsed)

      // Fetch active private token if visibility is PRIVATE
      let privateToken = undefined
      if (ticket.visibility === 'PRIVATE') {
        const { data: linkData } = await supabase
          .from('private_ticket_links')
          .select('token')
          .eq('ticket_type_id', ticket.id)
          .eq('status', 'ACTIVE')
          .maybeSingle()
        
        if (linkData) {
          privateToken = linkData.token
        }
      }

      processedTickets.push({
        ...ticket,
        issued: issuedCount || 0,
        reserved: reservedCount,
        remaining_quota: remainingQuota,
        privateToken,
        benefits: typeof ticket.benefits === 'string' ? JSON.parse(ticket.benefits) : ticket.benefits
      })
    }

    return NextResponse.json({ success: true, data: processedTickets })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/admin/tickets - Create a new ticket type
export async function POST(request: Request) {
  const auth = await checkSuperAdmin()
  const supabase = auth.supabase

  if (!auth.authorized || !supabase) {
    return NextResponse.json({ success: false, message: auth.message || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const body = await request.json()
    const {
      name,
      code,
      description,
      ticket_type,
      visibility,
      base_price,
      discount_percentage = 0,
      quota,
      min_purchase = 1,
      max_purchase = 1,
      sales_start_at,
      sales_end_at,
      benefits = [],
      status = 'DRAFT'
    } = body

    // 1. Validasi Input Dasar
    if (!name || !code || !ticket_type || base_price === undefined || quota === undefined || !sales_start_at || !sales_end_at) {
      return NextResponse.json({ success: false, message: 'Harap lengkapi semua field utama.' }, { status: 400 })
    }

    // 2. Business Rules Validation
    const parsedBasePrice = Number(base_price)
    const parsedDiscount = Number(discount_percentage)
    const parsedQuota = Number(quota)
    const parsedMin = Number(min_purchase)
    const parsedMax = Number(max_purchase)

    if (parsedBasePrice < 0) {
      return NextResponse.json({ success: false, message: 'Harga dasar tidak boleh negatif.' }, { status: 400 })
    }
    if (parsedDiscount < 0 || parsedDiscount > 100) {
      return NextResponse.json({ success: false, message: 'Persentase diskon harus bernilai 0 sampai 100.' }, { status: 400 })
    }
    if (parsedQuota <= 0) {
      return NextResponse.json({ success: false, message: 'Kuota harus lebih besar dari 0.' }, { status: 400 })
    }
    if (parsedMin < 1) {
      return NextResponse.json({ success: false, message: 'Minimal pembelian minimal 1.' }, { status: 400 })
    }
    if (parsedMax < parsedMin) {
      return NextResponse.json({ success: false, message: 'Maksimal pembelian tidak boleh kurang dari minimal pembelian.' }, { status: 400 })
    }

    const start = new Date(sales_start_at).getTime()
    const end = new Date(sales_end_at).getTime()
    if (isNaN(start) || isNaN(end) || end <= start) {
      return NextResponse.json({ success: false, message: 'Periode penjualan tidak valid. Tanggal berakhir harus setelah tanggal mulai.' }, { status: 400 })
    }

    // Calculate final price server-side
    const finalPrice = parsedBasePrice * (1 - parsedDiscount / 100)

    // Fetch active event
    const { data: activeEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (eventError || !activeEvent) {
      return NextResponse.json({ success: false, message: 'Tidak ada event aktif tempat mendaftarkan tiket ini.' }, { status: 400 })
    }

    // Insert to database
    const { data: newTicket, error: insertError } = await supabase
      .from('ticket_types')
      .insert({
        event_id: activeEvent.id,
        name,
        code: code.trim().toUpperCase(),
        description,
        ticket_type,
        visibility: visibility || 'PUBLIC',
        base_price: parsedBasePrice,
        discount_percentage: parsedDiscount,
        final_price: finalPrice,
        quota: parsedQuota,
        min_purchase: parsedMin,
        max_purchase: parsedMax,
        sales_start_at,
        sales_end_at,
        benefits: Array.isArray(benefits) ? JSON.stringify(benefits) : JSON.stringify([]),
        status
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ success: false, message: `Kode tiket '${code}' sudah terdaftar untuk event ini.` }, { status: 400 })
      }
      throw new Error(insertError.message)
    }

    let privateToken = undefined;
    if (newTicket.visibility === 'PRIVATE') {
      privateToken = generatePrivateToken();
      const { error: linkError } = await supabase
        .from('private_ticket_links')
        .insert({
          ticket_type_id: newTicket.id,
          token: privateToken,
          status: 'ACTIVE'
        });
      if (linkError) {
        console.error('Failed to create private link record:', linkError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tiket berhasil dibuat.',
      data: {
        ...newTicket,
        privateToken,
        benefits: JSON.parse(newTicket.benefits)
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
