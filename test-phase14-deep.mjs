import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from 'pdf-lib'
import jsQR from 'jsqr'
import sharp from 'sharp'
import { inflateSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

const envText = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '')
for (const raw of envText.split(/\r?\n/)) { const line = raw.trimEnd(); const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (!match || process.env[match[1]]) continue; let value = match[2]; if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); process.env[match[1]] = value }
const base = process.env.PHASE13_BASE_URL ?? 'http://localhost:3000'; const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const secret = process.env.SUPABASE_SECRET_KEY; assert(url && secret); const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? secret; const db = createClient(url, secret, { auth: { persistSession: false } })
async function session(label, emailKey, passwordKey) {
  const email = process.env[emailKey]
  const password = process.env[passwordKey]
  if (!email || !password) { console.log(`${label} login FAIL (missing credential)`); return null }
  try {
    const client = createClient(url, publishable, { auth: { persistSession: false } })
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data.session) throw error ?? new Error('No session returned')
    const { createServerClient } = await import('@supabase/ssr')
    const jar = new Map()
    const ssr = createServerClient(url, publishable, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)) } })
    const result = await ssr.auth.setSession(data.session)
    if (result.error) throw result.error
    const cookies = [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ')
    if (!cookies) throw new Error('SSR client did not produce session cookies')
    console.log(`${label} login PASS`)
    return cookies
  } catch (error) { console.log(`${label} login FAIL (${error instanceof Error ? error.message : 'unknown error'})`); return null }
}
async function request(pathname, cookies) { const response = await fetch(base + pathname, { headers: { cookie: cookies } }); return { response, bytes: Buffer.from(await response.arrayBuffer()) } }
function pdfStrings(bytes) { const output = []; const source = Buffer.from(bytes); let offset = 0; while ((offset = source.indexOf(Buffer.from('stream'), offset)) >= 0) { const start = source.indexOf(10, offset) + 1; const end = source.indexOf(Buffer.from('endstream'), start); if (start <= 0 || end <= start) break; const raw = source.subarray(start, end); const stream = raw.at(-1) === 13 ? raw.subarray(0, -1) : raw; let decoded = ''; try { decoded = inflateSync(stream).toString('latin1') } catch { decoded = stream.toString('latin1') } output.push(decoded); for (const match of decoded.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) { const hex = match[1].length % 2 ? `${match[1]}0` : match[1]; output.push(Buffer.from(hex, 'hex').toString('latin1')) } offset = end + 9 } return output.join(' ') }
async function decodePage(pdf, page) { const xObject = page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict); assert(xObject, 'missing PDF XObject'); for (const key of xObject.keys()) { const image = pdf.context.lookup(xObject.get(key), PDFRawStream); if (!image || image.dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue; const width = Number(image.dict.get(PDFName.of('Width'))?.toString()); const height = Number(image.dict.get(PDFName.of('Height'))?.toString()); const bits = Number(image.dict.get(PDFName.of('BitsPerComponent'))?.toString()); const color = image.dict.get(PDFName.of('ColorSpace'))?.toString(); if (width !== 600 || height !== 600 || bits !== 8 || !color?.includes('DeviceRGB')) continue; const filter = image.dict.get(PDFName.of('Filter'))?.toString() ?? ''; const imageBytes = filter.includes('FlateDecode') ? inflateSync(image.getContents()) : image.getContents(); const png = await sharp(imageBytes, { raw: { width, height, channels: 3 } }).png().toBuffer(); const raw = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const result = jsQR(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height); if (result?.data) return result.data } return null }
const admin = await session('ADMIN', 'PHASE13_ADMIN_EMAIL', 'PHASE13_ADMIN_PASSWORD')
assert(admin, 'Admin session unavailable')
const { data: rows, error } = await db.from('issued_tickets').select('id, order_id, ticket_code, qr_token, status, order_items!inner(participant_id, ticket_type_id, participants!inner(full_name), ticket_types!inner(name), orders!inner(order_code, events!inner(name)))').in('status', ['ACTIVE', 'CHECKED_IN']).order('order_id').order('created_at'); assert(!error && rows?.length); const ticket = rows[0]; const item = Array.isArray(ticket.order_items) ? ticket.order_items[0] : ticket.order_items; const participant = Array.isArray(item.participants) ? item.participants[0] : item.participants; const ticketType = Array.isArray(item.ticket_types) ? item.ticket_types[0] : item.ticket_types; const order = Array.isArray(item.orders) ? item.orders[0] : item.orders; const event = Array.isArray(order.events) ? order.events[0] : order.events

const individual = await request(`/api/admin/tickets/${ticket.id}/download`, admin); assert.equal(individual.response.status, 200); const pdf = await PDFDocument.load(individual.bytes); assert.equal(pdf.getPageCount(), 1); const text = pdfStrings(individual.bytes); console.log('Decoded content preview:', text.slice(0, 2000)); for (const value of [participant.full_name, order.order_code, ticket.ticket_code, ticketType.name, event.name]) assert(text.includes(value), `Missing PDF text: ${value}`); assert(!text.includes(ticket.qr_token)); assert.equal(await decodePage(pdf, pdf.getPages()[0]), `https://openmind2026.id/ticket/${ticket.qr_token}`) 
const orderRows = rows.filter((row) => row.order_id === ticket.order_id); const batch = await request(`/api/admin/orders/${ticket.order_id}/download-tickets`, admin); assert.equal(batch.response.status, 200); const batchPdf = await PDFDocument.load(batch.bytes); assert.equal(batchPdf.getPageCount(), orderRows.length); const decoded = []; for (const page of batchPdf.getPages()) decoded.push(await decodePage(batchPdf, page)); assert.deepEqual(decoded, orderRows.map((row) => `https://openmind2026.id/ticket/${row.qr_token}`)); assert(!pdfStrings(batch.bytes).includes(ticket.qr_token)); console.log('Phase 14 deep PDF verification passed')
