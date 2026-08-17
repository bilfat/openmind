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

// GET /api/admin/tickets/[id] - Get details of a single ticket type
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSuperAdmin()
  const supabase = auth.supabase

  if (!auth.authorized || !supabase) {
    return NextResponse.json({ success: false, message: auth.message || 'Unauthorized' }, { status: auth.status || 401 })
  }

  const { id: ticketId } = await params

  try {
    const { data: ticket, error: fetchError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (fetchError || !ticket) {
      return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan.' }, { status: 404 })
    }

    const now = new Date().toISOString()

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

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        issued: issuedCount || 0,
        reserved: reservedCount,
        remaining_quota: remainingQuota,
        privateToken,
        benefits: typeof ticket.benefits === 'string' ? JSON.parse(ticket.benefits) : ticket.benefits
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/admin/tickets/[id] - Update a ticket type
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSuperAdmin()
  const supabase = auth.supabase

  if (!auth.authorized || !supabase) {
    return NextResponse.json({ success: false, message: auth.message || 'Unauthorized' }, { status: auth.status || 401 })
  }

  const { id: ticketId } = await params

  try {
    const body = await request.json()
    const {
      name,
      code,
      description,
      ticket_type,
      visibility,
      base_price,
      discount_percentage,
      quota,
      min_purchase,
      max_purchase,
      sales_start_at,
      sales_end_at,
      benefits,
      status
    } = body

    // Fetch existing ticket type first to ensure it exists
    const { data: existingTicket, error: fetchError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (fetchError || !existingTicket) {
      return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan.' }, { status: 404 })
    }

    // Merge update values with existing ticket data for business validation
    const finalBasePrice = base_price !== undefined ? Number(base_price) : Number(existingTicket.base_price)
    const finalDiscount = discount_percentage !== undefined ? Number(discount_percentage) : Number(existingTicket.discount_percentage)
    const finalQuota = quota !== undefined ? Number(quota) : Number(existingTicket.quota)
    const finalMin = min_purchase !== undefined ? Number(min_purchase) : Number(existingTicket.min_purchase)
    const finalMax = max_purchase !== undefined ? Number(max_purchase) : Number(existingTicket.max_purchase)
    const finalStart = sales_start_at || existingTicket.sales_start_at
    const finalEnd = sales_end_at || existingTicket.sales_end_at

    // Business validation checks
    if (finalBasePrice < 0) {
      return NextResponse.json({ success: false, message: 'Harga dasar tidak boleh negatif.' }, { status: 400 })
    }
    if (finalDiscount < 0 || finalDiscount > 100) {
      return NextResponse.json({ success: false, message: 'Persentase diskon harus bernilai 0 sampai 100.' }, { status: 400 })
    }
    if (finalQuota <= 0) {
      return NextResponse.json({ success: false, message: 'Kuota harus lebih besar dari 0.' }, { status: 400 })
    }
    if (finalMin < 1) {
      return NextResponse.json({ success: false, message: 'Minimal pembelian minimal 1.' }, { status: 400 })
    }
    if (finalMax < finalMin) {
      return NextResponse.json({ success: false, message: 'Maksimal pembelian tidak boleh kurang dari minimal pembelian.' }, { status: 400 })
    }

    const startVal = new Date(finalStart).getTime()
    const endVal = new Date(finalEnd).getTime()
    if (isNaN(startVal) || isNaN(endVal) || endVal <= startVal) {
      return NextResponse.json({ success: false, message: 'Periode penjualan tidak valid. Tanggal berakhir harus setelah tanggal mulai.' }, { status: 400 })
    }

    // Calculate final price server-side
    const finalPrice = finalBasePrice * (1 - finalDiscount / 100)

    // Build update object
    const updateData: any = {
      final_price: finalPrice
    }
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code.trim().toUpperCase()
    if (description !== undefined) updateData.description = description
    if (ticket_type !== undefined) updateData.ticket_type = ticket_type
    if (visibility !== undefined) updateData.visibility = visibility
    if (base_price !== undefined) updateData.base_price = finalBasePrice
    if (discount_percentage !== undefined) updateData.discount_percentage = finalDiscount
    if (quota !== undefined) updateData.quota = finalQuota
    if (min_purchase !== undefined) updateData.min_purchase = finalMin
    if (max_purchase !== undefined) updateData.max_purchase = finalMax
    if (sales_start_at !== undefined) updateData.sales_start_at = finalStart
    if (sales_end_at !== undefined) updateData.sales_end_at = finalEnd
    if (benefits !== undefined) updateData.benefits = Array.isArray(benefits) ? JSON.stringify(benefits) : JSON.stringify([])
    if (status !== undefined) updateData.status = status

    // Update row
    const { data: updatedTicket, error: updateError } = await supabase
      .from('ticket_types')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ success: false, message: `Kode tiket '${code}' sudah terdaftar untuk event ini.` }, { status: 400 })
      }
      throw new Error(updateError.message)
    }

    let privateToken = undefined;
    if (updatedTicket.visibility === 'PRIVATE') {
      const { data: linkData } = await supabase
        .from('private_ticket_links')
        .select('token')
        .eq('ticket_type_id', updatedTicket.id)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      if (linkData) {
        privateToken = linkData.token;
      } else {
        privateToken = generatePrivateToken();
        const { error: linkError } = await supabase
          .from('private_ticket_links')
          .insert({
            ticket_type_id: updatedTicket.id,
            token: privateToken,
            status: 'ACTIVE'
          });
        if (linkError) {
          console.error('Failed to create private link record on update:', linkError.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tiket berhasil diperbarui.',
      data: {
        ...updatedTicket,
        privateToken,
        benefits: JSON.parse(updatedTicket.benefits)
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/admin/tickets/[id] - Delete a ticket type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSuperAdmin()
  const supabase = auth.supabase

  if (!auth.authorized || !supabase) {
    return NextResponse.json({ success: false, message: auth.message || 'Unauthorized' }, { status: auth.status || 401 })
  }

  const { id: ticketId } = await params

  try {
    const { error: deleteError } = await supabase
      .from('ticket_types')
      .delete()
      .eq('id', ticketId)

    if (deleteError) {
      if (deleteError.code === '23503') {
        return NextResponse.json({
          success: false,
          message: 'Tidak dapat menghapus tiket karena sudah ada transaksi pembelian atau reservasi terkait tiket ini.'
        }, { status: 400 })
      }
      throw new Error(deleteError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Tiket berhasil dihapus.'
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
