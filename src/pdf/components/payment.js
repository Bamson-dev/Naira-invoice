const { PAGE, SPACE } = require('../constants');
const { drawLabel, drawWrapped, setStyle } = require('../measure');

function renderPayment(ctx) {
  const { doc, theme, layout, invoice, profile, qrBuffer } = ctx;
  const bankName = profile.bank_name || profile.bankName;
  const accountNo = profile.account_number || profile.accountNumber;
  const accountName = profile.account_name || profile.accountName;
  const hasBank = Boolean(bankName || accountNo || accountName);
  const cardH = hasBank ? 108 : 118;
  layout.ensure(cardH + SPACE.md);

  const y0 = layout.y;
  doc.roundedRect(PAGE.contentLeft, y0, PAGE.contentWidth, cardH, 12).fill(theme.surface);
  doc.roundedRect(PAGE.contentLeft, y0, PAGE.contentWidth, cardH, 12).lineWidth(0.75).strokeColor(theme.line).stroke();

  const leftX = PAGE.contentLeft + SPACE.md;
  const rightX = PAGE.contentLeft + PAGE.contentWidth * 0.52;
  const colW = PAGE.contentWidth * 0.44;

  drawLabel(doc, theme, leftX, y0 + SPACE.md, 'Payment details');
  const bankLines = [
    bankName ? `Bank · ${bankName}` : 'Bank · —',
    accountNo ? `Account · ${accountNo}` : 'Account · —',
    accountName ? `Name · ${accountName}` : 'Name · —'
  ];
  let by = y0 + SPACE.md + 14;
  bankLines.forEach((line) => {
    by += drawWrapped(doc, theme, leftX, by, colW, line, { color: 'text', size: 9 }) + 3;
  });
  if (!hasBank) {
    drawWrapped(doc, theme, leftX, by, colW, 'Add bank details in Profile to display them here.', {
      color: 'muted',
      size: 8
    });
  }

  drawLabel(doc, theme, rightX, y0 + SPACE.md, 'Notes');
  drawWrapped(
    doc,
    theme,
    rightX,
    y0 + SPACE.md + 14,
    colW - SPACE.md,
    invoice.notes || 'Please pay via bank transfer and include your invoice number as reference.',
    { color: 'text', size: 9 }
  );

  if (qrBuffer) {
    try {
      doc.image(qrBuffer, PAGE.contentRight - 58, y0 + cardH - 58, { fit: [48, 48] });
    } catch {
      /* ignore bad qr */
    }
  }

  layout.y = y0 + cardH + SPACE.lg;
}

module.exports = { renderPayment };
