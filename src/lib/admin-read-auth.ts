import { createClient } from '@/lib/supabase/server'

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export type AdminReadAuth =
  | { authorized: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { authorized: false; status: 401 | 403; message: string }

export async function requireActiveAdmin(): Promise<AdminReadAuth> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { authorized: false, status: 401, message: 'Unauthorized: Sesi tidak ditemukan.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.status !== 'ACTIVE' || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return { authorized: false, status: 403, message: 'Forbidden: Anda tidak memiliki akses.' }
  }

  return { authorized: true, supabase, userId: user.id }
}

export function parsePagination(params: URLSearchParams) {
  const rawPage = params.get('page') ?? '1'
  const rawLimit = params.get('limit') ?? String(DEFAULT_PAGE_SIZE)
  const page = Number(rawPage)
  const limit = Number(rawLimit)

  if (!/^\d+$/.test(rawPage) || !/^\d+$/.test(rawLimit) || page < 1 || limit < 1 || limit > MAX_PAGE_SIZE) {
    return { error: 'Parameter page/limit tidak valid. limit maksimum adalah 100.' as const }
  }

  return { page, limit, offset: (page - 1) * limit }
}

export function parseSearch(params: URLSearchParams) {
  const search = (params.get('search') ?? '').trim()
  if (search.length > 100) return { error: 'Search maksimal 100 karakter.' as const }
  return { search }
}

export function jsonError(message: string, status: number) {
  return Response.json({ success: false, message }, { status })
}
