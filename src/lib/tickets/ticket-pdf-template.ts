import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib'
import { createTicketQrDataUrl, TicketPdfData } from './ticket-pdf-data'

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : ''
}

function wrapTextInBox(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  if (!text || text === '-') return ['']
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? ' ' : '') + words[i]
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)
    if (testWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = words[i]
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function wrapUrlText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  if (!text) return ['']
  const lines: string[] = []
  let currentLine = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const testLine = currentLine + char
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)

    if (testWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine)
      }
      currentLine = char
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine)
  }
  return lines
}

export async function renderTicketPage(pdf: PDFDocument, ticket: TicketPdfData) {
  const page = pdf.addPage([595.28, 841.89])

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // =========================================================
  // TICKET PALETTE
  // =========================================================
  const navy = rgb(0.06, 0.13, 0.24)
  const navy2 = rgb(0.09, 0.17, 0.30)
  const gold = rgb(0.78, 0.61, 0.25)
  const softGold = rgb(0.63, 0.48, 0.20)
  const cream = rgb(0.98, 0.97, 0.93)
  const white = rgb(1, 1, 1)
  const textDark = rgb(0.08, 0.13, 0.24)
  const textMedium = rgb(0.40, 0.42, 0.45)
  const border = rgb(0.84, 0.80, 0.70)
  const lightBorder = rgb(0.91, 0.89, 0.84)
  const shadow = rgb(0.89, 0.87, 0.82)
  const green = rgb(0.18, 0.45, 0.30)

  const pageWidth = 595.28
  const pageHeight = 841.89

  // =========================================================
  // PAGE BACKGROUND
  // =========================================================
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: cream,
  })

  // =========================================================
  // TICKET DIMENSIONS
  // The ticket is intentionally built as a real ticket silhouette:
  // - visible outer body
  // - detachable right stub
  // - perforation line
  // - semicircular cut-outs
  // - subtle shadow
  // =========================================================
  // Fill the A4 canvas much more tightly so the ticket reads as a full-page ticket.
  const ticketX = 0
  const ticketY = 0
  const ticketW = pageWidth
  const ticketH = pageHeight
  const ticketTop = ticketY + ticketH

  const stubW = 178
  const dividerX = ticketX + ticketW - stubW

  // Soft shadow behind the ticket.
  page.drawRectangle({
    x: ticketX + 4,
    y: ticketY - 5,
    width: ticketW,
    height: ticketH,
    color: shadow,
  })

  // Main ticket body.
  page.drawRectangle({
    x: ticketX,
    y: ticketY,
    width: ticketW,
    height: ticketH,
    color: white,
    borderColor: border,
    borderWidth: 1,
  })

  // =========================================================
  // TICKET HEADER
  // =========================================================
  const headerH = 132
  const headerBottom = ticketTop - headerH

  page.drawRectangle({
    x: ticketX,
    y: headerBottom,
    width: ticketW,
    height: headerH,
    color: navy,
  })

  // Slightly different navy strip for the detachable stub.
  page.drawRectangle({
    x: dividerX,
    y: headerBottom,
    width: ticketX + ticketW - dividerX,
    height: headerH,
    color: navy2,
  })

  // Gold accent line.
  page.drawRectangle({
    x: ticketX,
    y: headerBottom,
    width: ticketW,
    height: 4,
    color: gold,
  })

  // Event identity.
  page.drawText('OPEN MIND', {
    x: ticketX + 25,
    y: ticketTop - 43,
    size: 29,
    font: bold,
    color: white,
  })

  page.drawText('2026  ·  OFFICIAL E-TICKET', {
    x: ticketX + 26,
    y: ticketTop - 65,
    size: 10,
    font: regular,
    color: rgb(0.86, 0.79, 0.62),
  })

  // Admission type stays prominent.
  page.drawText(ticket.ticketTypeName.toUpperCase(), {
    x: ticketX + 26,
    y: headerBottom + 29,
    size: 19,
    font: bold,
    color: white,
  })

  page.drawText('ADMISSION PASS', {
    x: ticketX + 27,
    y: headerBottom + 14,
    size: 8,
    font: bold,
    color: rgb(0.78, 0.72, 0.58),
  })

  // Stub header.
  const stubCenterX = dividerX + stubW / 2
  const stubLabel = 'ENTRY'
  const stubLabelW = bold.widthOfTextAtSize(stubLabel, 7)
  page.drawText(stubLabel, {
    x: stubCenterX - stubLabelW / 2,
    y: ticketTop - 37,
    size: 8.5,
    font: bold,
    color: rgb(0.78, 0.72, 0.58),
  })

  const stubType = ticket.ticketTypeName.toUpperCase()
  const stubTypeW = bold.widthOfTextAtSize(stubType, 11)
  page.drawText(stubType, {
    x: stubCenterX - stubTypeW / 2,
    y: ticketTop - 59,
    size: 13,
    font: bold,
    color: white,
  })

  page.drawText('SCAN TO VERIFY', {
    x: stubCenterX - bold.widthOfTextAtSize('SCAN TO VERIFY', 6.5) / 2,
    y: headerBottom + 22,
    size: 8,
    font: bold,
    color: rgb(0.78, 0.72, 0.58),
  })

  // =========================================================
  // PERFORATION / DETACHABLE STUB
  // =========================================================
  const perforationTop = ticketTop - 12
  const perforationBottom = ticketY + 12

  // Dashed perforation line.
  const dashLength = 5
  const gapLength = 5
  let dashY = perforationBottom

  while (dashY < perforationTop) {
    const nextY = Math.min(dashY + dashLength, perforationTop)

    page.drawLine({
      start: { x: dividerX, y: dashY },
      end: { x: dividerX, y: nextY },
      thickness: 1,
      color: border,
    })

    dashY += dashLength + gapLength
  }

  // Circular cut-outs make the ticket silhouette read like a real
  // detachable admission ticket. The circles use the page background
  // color so they visually "cut" into the ticket edge.
  const notchRadius = 13

  page.drawCircle({
    x: dividerX,
    y: headerBottom,
    size: notchRadius,
    color: cream,
  })

  page.drawCircle({
    x: dividerX,
    y: ticketY,
    size: notchRadius,
    color: cream,
  })

  // Re-draw the short perforation segments around the cut-outs.
  page.drawLine({
    start: { x: dividerX, y: ticketY + notchRadius },
    end: { x: dividerX, y: ticketY + 45 },
    thickness: 1,
    color: border,
  })

  page.drawLine({
    start: { x: dividerX, y: headerBottom - 45 },
    end: { x: dividerX, y: headerBottom - notchRadius },
    thickness: 1,
    color: border,
  })

  page.drawLine({
    start: { x: dividerX, y: headerBottom + notchRadius },
    end: { x: dividerX, y: ticketTop - 45 },
    thickness: 1,
    color: border,
  })

  // =========================================================
  // CONTENT AREA
  // =========================================================
  const bodyTop = headerBottom - 30
  // Keep the lower utility area clear after enlarging the ticket.
  const bodyBottom = ticketY + 62

  const leftX = ticketX + 25
  const leftW = dividerX - leftX - 24

  // Ticket holder title.
  page.drawText('TICKET HOLDER', {
    x: leftX,
    y: bodyTop,
    size: 8.5,
    font: bold,
    color: softGold,
  })

  // Large participant name.
  page.drawText(ticket.participantName || '-', {
    x: leftX,
    y: bodyTop - 25,
    size: 20,
    font: bold,
    color: textDark,
  })

  page.drawLine({
    start: { x: leftX, y: bodyTop - 39 },
    end: { x: dividerX - 20, y: bodyTop - 39 },
    thickness: 1,
    color: lightBorder,
  })

  // =========================================================
  // FIELD HELPER
  // =========================================================
  const drawField = (
    label: string,
    value: string,
    x: number,
    topY: number,
    width: number,
    options?: {
      valueSize?: number
      valueFont?: PDFFont
      valueColor?: ReturnType<typeof rgb>
      maxLines?: number
    },
  ) => {
    const valueSize = options?.valueSize ?? 11.5
    const valueFont = options?.valueFont ?? regular
    const valueColor = options?.valueColor ?? textDark
    const maxLines = options?.maxLines ?? 2

    page.drawText(label.toUpperCase(), {
      x,
      y: topY,
      size: 8,
      font: bold,
      color: softGold,
    })

    const lines = wrapTextInBox(
      value || '-',
      width,
      valueFont,
      valueSize,
    ).slice(0, maxLines)

    let valueY = topY - 15

    for (const line of lines) {
      page.drawText(line, {
        x,
        y: valueY,
        size: valueSize,
        font: valueFont,
        color: valueColor,
      })

      valueY -= valueSize + 3
    }
  }

  // =========================================================
  // DATA / IDENTITY
  // Keep every existing ticket field.
  // =========================================================
  const fieldGapY = 62
  const halfGap = 15
  const halfW = (leftW - halfGap) / 2

  drawField(
    'NIM',
    ticket.participantNim ?? '-',
    leftX,
    bodyTop - 67,
    halfW,
  )

  drawField(
    'TICKET CODE',
    ticket.ticketCode,
    leftX + halfW + halfGap,
    bodyTop - 67,
    halfW,
    { valueSize: 10.5 },
  )

  drawField(
    'FACULTY / STUDY PROGRAM',
    [ticket.participantFaculty, ticket.participantStudyProgram]
      .filter(Boolean)
      .join(' · ') || '-',
    leftX,
    bodyTop - 67 - fieldGapY,
    leftW,
    { valueSize: 10.5, maxLines: 2 },
  )

  drawField(
    'DATE',
    formatDate(ticket.eventDate),
    leftX,
    bodyTop - 67 - fieldGapY * 2,
    halfW,
    { valueSize: 10.5 },
  )

  drawField(
    'TIME',
    `${formatTime(ticket.startTime)}${ticket.endTime ? ` – ${formatTime(ticket.endTime)}` : ''}`,
    leftX + halfW + halfGap,
    bodyTop - 67 - fieldGapY * 2,
    halfW,
    { valueSize: 10.5 },
  )

  drawField(
    'VENUE',
    ticket.venue,
    leftX,
    bodyTop - 67 - fieldGapY * 3,
    leftW,
    { valueSize: 10.5, maxLines: 2 },
  )

  // =========================================================
  // STATUS BADGE
  // =========================================================
  const statusValue = ticket.status === 'CHECKED_IN' ? 'CHECKED IN' : 'ACTIVE'
  const statusTop = bodyBottom + 67

  page.drawText('STATUS', {
    x: leftX,
    y: statusTop + 24,
    size: 8,
    font: bold,
    color: softGold,
  })

  const statusWidth = bold.widthOfTextAtSize(statusValue, 8.2) + 22

  page.drawRectangle({
    x: leftX,
    y: statusTop,
    width: statusWidth,
    height: 22,
    color: ticket.status === 'CHECKED_IN'
      ? rgb(0.93, 0.97, 0.94)
      : rgb(0.95, 0.95, 0.95),
    borderColor: ticket.status === 'CHECKED_IN'
      ? rgb(0.72, 0.84, 0.76)
      : border,
    borderWidth: 1,
  })

  page.drawText(statusValue, {
    x: leftX + 11,
    y: statusTop + 5.5,
    size: 10,
    font: bold,
    color: ticket.status === 'CHECKED_IN' ? green : textDark,
  })

  // =========================================================
  // WHATSAPP GROUP
  // Keep the existing URL visible; no content is removed.
  // =========================================================
  if (ticket.whatsappGroupUrl) {
    const whatsappY = bodyBottom + 6
    const whatsappRight = dividerX - 20

    page.drawText('GROUP WHATSAPP', {
      x: leftX,
      y: whatsappY + 32,
      size: 8,
      font: bold,
      color: softGold,
    })

    page.drawText('Join Event WhatsApp Group', {
      x: leftX,
      y: whatsappY + 17,
      size: 9,
      font: regular,
      color: textDark,
    })

    // URL is kept as text exactly as before, but constrained to the
    // ticket body so long URLs never collide with the QR stub.
    const urlLines = wrapUrlText(
      ticket.whatsappGroupUrl,
      whatsappRight - leftX,
      regular,
      8,
    ).slice(0, 2)

    let urlY = whatsappY + 3

    for (const line of urlLines) {
      page.drawText(line, {
        x: leftX,
        y: urlY,
        size: 8,
        font: regular,
        color: rgb(0.2, 0.4, 0.6),
      })

      urlY -= 11
    }
  }

  // =========================================================
  // RIGHT STUB — QR VERIFICATION
  // =========================================================
  const qrCenterX = dividerX + stubW / 2

  page.drawText('TICKET VERIFICATION', {
    x: qrCenterX - bold.widthOfTextAtSize('TICKET VERIFICATION', 6.5) / 2,
    y: headerBottom - 28,
    size: 8,
    font: bold,
    color: softGold,
  })

  const scanTitle = 'SCAN TO VERIFY TICKET'
  const scanTitleWidth = bold.widthOfTextAtSize(scanTitle, 8.5)

  page.drawText(scanTitle, {
    x: qrCenterX - scanTitleWidth / 2,
    y: headerBottom - 48,
    size: 10,
    font: bold,
    color: gold,
  })

  // Generate QR at high source resolution.
  const qrDataUrl = await createTicketQrDataUrl(ticket.qrToken)
  const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qrImage = await pdf.embedPng(qrBytes)

  const qrSize = 145
  const qrPadding = 12
  const qrBoxSize = qrSize + qrPadding * 2
  const qrBoxX = qrCenterX - qrBoxSize / 2
  const qrBoxY = headerBottom - 48 - qrBoxSize - 17

  page.drawRectangle({
    x: qrBoxX,
    y: qrBoxY,
    width: qrBoxSize,
    height: qrBoxSize,
    color: rgb(0.99, 0.99, 0.98),
    borderColor: border,
    borderWidth: 1,
  })

  page.drawImage(qrImage, {
    x: qrCenterX - qrSize / 2,
    y: qrBoxY + qrPadding,
    width: qrSize,
    height: qrSize,
  })

  const instruction = 'Present this ticket at the venue entrance.'
  const instructionLines = wrapTextInBox(
    instruction,
    stubW - 36,
    regular,
    9,
  )

  let instructionY = qrBoxY - 19

  for (const line of instructionLines) {
    const lineWidth = regular.widthOfTextAtSize(line, 9)

    page.drawText(line, {
      x: qrCenterX - lineWidth / 2,
      y: instructionY,
      size: 9,
      font: regular,
      color: textMedium,
    })

    instructionY -= 13
  }

  page.drawText('Keep the QR code visible', {
    x: qrCenterX - bold.widthOfTextAtSize('Keep the QR code visible', 6.5) / 2,
    y: ticketY + 111,
    size: 8,
    font: bold,
    color: textMedium,
  })

  page.drawText('when checking in.', {
    x: qrCenterX - regular.widthOfTextAtSize('when checking in.', 6.5) / 2,
    y: ticketY + 100,
    size: 8,
    font: regular,
    color: textMedium,
  })

  // =========================================================
  // TICKET CODE ON DETACHABLE STUB
  // =========================================================
  const codeLabel = 'TICKET CODE'
  const codeValue = ticket.ticketCode

  const codeLabelWidth = bold.widthOfTextAtSize(codeLabel, 6.5)
  const codeValueWidth = regular.widthOfTextAtSize(codeValue, 10.5)

  page.drawText(codeLabel, {
    x: qrCenterX - codeLabelWidth / 2,
    y: ticketY + 72,
    size: 8,
    font: bold,
    color: softGold,
  })

  page.drawText(codeValue, {
    x: qrCenterX - codeValueWidth / 2,
    y: ticketY + 56,
    size: 10,
    font: regular,
    color: textDark,
  })

  // Small "tear here" cue reinforces the ticket/stub relationship.
  const tearText = 'TEAR / DETACH'
  const tearTextWidth = bold.widthOfTextAtSize(tearText, 7)

  page.drawText(tearText, {
    x: dividerX - tearTextWidth / 2,
    y: ticketY + 24,
    size: 7,
    font: bold,
    color: softGold,
  })

  // =========================================================
  // FOOTER
  // =========================================================
  const footerText =
    'This ticket is valid only for the named guest and selected admission type.'
  const footerSize = 9
  const footerWidth = regular.widthOfTextAtSize(footerText, footerSize)

  page.drawText(footerText, {
    x: (pageWidth - footerWidth) / 2,
    y: ticketY + 8,
    size: footerSize,
    font: regular,
    color: textMedium,
  })

  return page
}