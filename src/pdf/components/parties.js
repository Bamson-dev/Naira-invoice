const { PAGE, SPACE } = require('../constants');
const { drawLabel, drawWrapped, drawDivider } = require('../measure');

function renderParties(ctx) {
  const { doc, theme, layout, invoice, profile } = ctx;
  layout.ensure(120);

  const y0 = layout.y;
  const colW = (PAGE.contentWidth - SPACE.lg) / 2;
  const leftX = PAGE.contentLeft;
  const rightX = PAGE.contentLeft + colW + SPACE.lg;

  drawLabel(doc, theme, leftX, y0, 'From');
  const fromH = drawWrapped(doc, theme, leftX, y0 + 12, colW, profile.business_name || 'Business', {
    bold: true,
    size: 11
  });
  let leftBlock = 12 + fromH + 4;
  if (profile.business_address) {
    leftBlock += drawWrapped(doc, theme, leftX, y0 + leftBlock, colW, profile.business_address, {
      color: 'muted',
      size: 9
    }) + 4;
  }
  const fromContact = [profile.email, profile.phone].filter(Boolean).join(' · ');
  if (fromContact) {
    leftBlock += drawWrapped(doc, theme, leftX, y0 + leftBlock, colW, fromContact, {
      color: 'muted',
      size: 9
    });
  }

  drawLabel(doc, theme, rightX, y0, 'Bill to');
  const billName = invoice.clients?.client_name || invoice.temp_client_name || 'Client';
  const billH = drawWrapped(doc, theme, rightX, y0 + 12, colW, billName, { bold: true, size: 11 });
  let rightBlock = 12 + billH + 4;
  const billAddress = invoice.clients?.client_address || invoice.temp_client_address;
  if (billAddress) {
    rightBlock += drawWrapped(doc, theme, rightX, y0 + rightBlock, colW, billAddress, {
      color: 'muted',
      size: 9
    }) + 4;
  }
  const billContact = [
    invoice.clients?.client_email || invoice.temp_client_email,
    invoice.clients?.client_phone || invoice.temp_client_phone
  ]
    .filter(Boolean)
    .join(' · ');
  if (billContact) {
    rightBlock += drawWrapped(doc, theme, rightX, y0 + rightBlock, colW, billContact, {
      color: 'muted',
      size: 9
    });
  }

  layout.y = y0 + Math.max(leftBlock, rightBlock) + SPACE.lg;
  drawDivider(doc, theme, layout.y);
  layout.y += SPACE.md;
}

module.exports = { renderParties };
