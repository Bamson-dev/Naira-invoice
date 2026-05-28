/** A4 page + spacing system (points). Stripe-inspired rhythm. */
const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 52,
  get contentLeft() {
    return this.margin;
  },
  get contentRight() {
    return this.width - this.margin;
  },
  get contentWidth() {
    return this.contentRight - this.contentLeft;
  },
  footerY: 788
};

const SPACE = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
};

/** Table columns — money columns are wider; description yields space. */
const TABLE_COLS = {
  description: { left: 52, right: 246 },
  qty: { left: 250, right: 284 },
  unitPrice: { left: 288, right: 408 },
  lineTotal: { left: 412, right: 543 }
};

const TOTALS = {
  width: 280,
  get left() {
    return PAGE.contentRight - this.width;
  },
  get right() {
    return PAGE.contentRight;
  }
};

const ROW = {
  tableHeader: 28,
  tableMin: 32,
  tablePad: 10,
  summary: 24,
  summaryTotal: 34
};

module.exports = { PAGE, SPACE, TABLE_COLS, TOTALS, ROW };
