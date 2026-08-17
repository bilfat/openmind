import { PDFDocument } from 'pdf-lib'
import { renderTicketPage } from './ticket-pdf-template'
import { TICKET_PDF_TIMEOUT_MS, TicketPdfData } from './ticket-pdf-data'

export async function renderTicketsPdf(tickets: TicketPdfData[]) {
  if (!tickets.length) throw new Error('NO_ISSUED_TICKETS')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TICKET_PDF_TIMEOUT_MS)
  try {
    const pdf = await PDFDocument.create()
    for (const ticket of tickets) {
      if (controller.signal.aborted) throw new Error('PDF_RENDER_TIMEOUT')
      await renderTicketPage(pdf, ticket)
    }
    return Buffer.from(await pdf.save())
  } finally {
    clearTimeout(timer)
  }
}
