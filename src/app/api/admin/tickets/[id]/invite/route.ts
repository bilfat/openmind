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

  return { authorized: true, supabase, user }
}

function generatePrivateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSuperAdmin()
  const supabase = auth.supabase

  if (!auth.authorized || !supabase || !auth.user) {
    return NextResponse.json({ success: false, message: auth.message || 'Unauthorized' }, { status: auth.status || 401 })
  }

  const { id: ticketId } = await params

  try {
    // 1. Fetch ticket to ensure it exists and visibility is PRIVATE
    const { data: ticket, error: ticketError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketError) {
      throw new Error(`Failed to query ticket type: ${ticketError.message}`)
    }

    if (!ticket) {
      return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan.' }, { status: 404 })
    }

    if (ticket.visibility !== 'PRIVATE') {
      return NextResponse.json({ success: false, message: 'Pendaftaran khusus (private token) hanya dapat dikelola pada tiket dengan visibilitas PRIVATE.' }, { status: 400 })
    }

    // 2. Revoke all existing active tokens for this ticket
    const { error: revokeError } = await supabase
      .from('private_ticket_links')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString()
      })
      .eq('ticket_type_id', ticketId)
      .eq('status', 'ACTIVE')

    if (revokeError) {
      throw new Error(`Failed to revoke old links: ${revokeError.message}`)
    }

    // 3. Generate a new unique token
    let newToken = ''
    let isUnique = false
    let attempts = 0

    while (!isUnique && attempts < 5) {
      attempts++
      const candidate = generatePrivateToken()
      
      const { data: existing, error: checkError } = await supabase
        .from('private_ticket_links')
        .select('id')
        .eq('token', candidate)
        .maybeSingle()

      if (checkError) {
        throw new Error(`Token uniqueness check failed: ${checkError.message}`)
      }

      if (!existing) {
        newToken = candidate
        isUnique = true
      }
    }

    if (!newToken) {
      throw new Error('Failed to generate a unique token after 5 attempts.')
    }

    // 4. Insert the new active token
    const { data: newLink, error: insertError } = await supabase
      .from('private_ticket_links')
      .insert({
        ticket_type_id: ticketId,
        token: newToken,
        status: 'ACTIVE',
        created_by: auth.user.id
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to register new link: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Token pendaftaran khusus berhasil diperbarui.',
      data: newLink
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
