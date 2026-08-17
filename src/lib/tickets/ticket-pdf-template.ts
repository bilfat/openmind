import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib'
import { createTicketQrDataUrl, TicketPdfData } from './ticket-pdf-data'

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : ''
}

function drawLabelValue(page: PDFPage, label: string, value: string, x: number, y: number, font: PDFFont, bold: PDFFont) {
  page.drawText(label.toUpperCase(), { x, y, size: 7, font: bold, color: rgb(0.63, 0.48, 0.2) })
  page.drawText(value || '-', { x, y: y - 14, size: 11, font, color: rgb(0.08, 0.13, 0.24), maxWidth: 235 })
}

export async function renderTicketPage(pdf: PDFDocument, ticket: TicketPdfData) {
  const page = pdf.addPage([595.28, 841.89])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.06, 0.13, 0.24)
  const gold = rgb(0.78, 0.61, 0.25)
  const cream = rgb(0.98, 0.97, 0.93)

  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: cream })
  page.drawRectangle({ x: 0, y: 690, width: 595.28, height: 151.89, color: navy })
  page.drawRectangle({ x: 0, y: 690, width: 595.28, height: 5, color: gold })
  page.drawText('OPEN MIND', { x: 46, y: 785, size: 27, font: bold, color: rgb(1, 1, 1) })
  page.drawText('2026  ·  OFFICIAL E-TICKET', { x: 48, y: 758, size: 10, font: regular, color: rgb(0.84, 0.77, 0.56) })
  page.drawText(ticket.eventName, { x: 48, y: 718, size: 16, font: bold, color: rgb(1, 1, 1), maxWidth: 490 })

  page.drawRectangle({ x: 38, y: 98, width: 519, height: 555, color: rgb(1, 1, 1), borderColor: rgb(0.86, 0.81, 0.68), borderWidth: 1 })
  page.drawText('ADMISSION PASS', { x: 60, y: 610, size: 9, font: bold, color: gold })
  page.drawText(ticket.ticketTypeName, { x: 60, y: 578, size: 24, font: bold, color: navy, maxWidth: 360 })
  page.drawText(`ORDER  ${ticket.orderCode}`, { x: 60, y: 550, size: 10, font: bold, color: rgb(0.28, 0.32, 0.39) })
  page.drawLine({ start: { x: 60, y: 525 }, end: { x: 535, y: 525 }, thickness: 1, color: rgb(0.9, 0.88, 0.82) })

  drawLabelValue(page, 'Guest', ticket.participantName, 60, 490, regular, bold)
  drawLabelValue(page, 'Ticket code', ticket.ticketCode, 315, 490, regular, bold)
  drawLabelValue(page, 'NIM', ticket.participantNim ?? '-', 60, 430, regular, bold)
  drawLabelValue(page, 'Faculty / study program', [ticket.participantFaculty, ticket.participantStudyProgram].filter(Boolean).join(' · ') || '-', 315, 430, regular, bold)
  drawLabelValue(page, 'Date', formatDate(ticket.eventDate), 60, 370, regular, bold)
  drawLabelValue(page, 'Time', `${formatTime(ticket.startTime)}${ticket.endTime ? ` - ${formatTime(ticket.endTime)}` : ''}`, 315, 370, regular, bold)
  drawLabelValue(page, 'Venue', ticket.venue, 60, 310, regular, bold)
  drawLabelValue(page, 'Status', ticket.status === 'CHECKED_IN' ? 'CHECKED IN' : 'ACTIVE', 315, 310, regular, bold)

  const qrDataUrl = await createTicketQrDataUrl(ticket.qrToken)
  const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qr = await pdf.embedPng(qrBytes)
  page.drawRectangle({ x: 205, y: 130, width: 185, height: 145, color: rgb(0.98, 0.98, 0.96), borderColor: rgb(0.86, 0.81, 0.68), borderWidth: 1 })
  page.drawImage(qr, { x: 225, y: 145, width: 115, height: 115 })
  page.drawText('SCAN TO VERIFY TICKET', { x: 348, y: 203, size: 8, font: bold, color: gold, maxWidth: 120 })
  page.drawText('Present this ticket at the venue entrance.', { x: 348, y: 183, size: 8, font: regular, color: rgb(0.28, 0.32, 0.39), maxWidth: 145 })

  page.drawText('This ticket is valid only for the named guest and selected admission type.', { x: 60, y: 57, size: 8, font: regular, color: rgb(0.4, 0.42, 0.45), maxWidth: 475 })
  return page
}
