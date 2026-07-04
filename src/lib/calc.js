// src/lib/calc.js
// All business-rule math lives here in one place, so every screen
// (Dashboard, Reports, Ledger, Outstanding) uses the exact same numbers.

/* ---------- Basic indent math ---------- */
export function indentValue(indent) {
  return (Number(indent.quantity) || 0) * (Number(indent.rate) || 0);
}

export function indentCommission(indent) {
  return (indentValue(indent) * (Number(indent.commissionPct) || 0)) / 100;
}

export function totalDispatchedQty(indent) {
  return (indent.dispatches || []).reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
}

/* ---------- Ageing buckets ---------- */
export const AGEING_BUCKETS = ["0-30", "31-60", "61-90", "91-120", "120+"];

export function ageBucket(days) {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

/* ---------- FIFO allocation of a buyer's collections across their indents ----------
   This is the same principle used in Amihem Sales for FIFO commission calculation:
   the oldest indent gets paid off first. This lets us know, per indent, how much
   is still outstanding and how old that outstanding amount is (for ageing) —
   and, since commission is earned proportionally to what's actually been paid,
   how much commission has been realized vs is still accrued.
------------------------------------------------------------------------------ */
export function allocateBuyerCollections(buyerIndents, totalCollections, creditDays = 0) {
  const sorted = [...buyerIndents].sort((a, b) => new Date(a.date) - new Date(b.date));
  let pool = Number(totalCollections) || 0;
  const today = new Date();

  return sorted.map((ind) => {
    const value = indentValue(ind);
    const paid = Math.max(0, Math.min(pool, value));
    pool -= paid;
    const balance = value - paid;

    const dueDate = new Date(ind.date);
    dueDate.setDate(dueDate.getDate() + (Number(creditDays) || 0));
    const ageDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    const paidRatio = value > 0 ? paid / value : 0;
    const commission = indentCommission(ind);

    return {
      indent: ind,
      value,
      paid,
      balance,
      ageDays,
      bucket: balance > 0.5 ? ageBucket(Math.max(ageDays, 0)) : null,
      commissionTotal: commission,
      commissionRealized: commission * paidRatio,
      commissionAccrued: commission * (1 - paidRatio),
    };
  });
}

/* ---------- Buyer outstanding summary (used by Outstanding tab & Dashboard) ---------- */
export function buyerOutstandingSummary(buyer, allIndents, allCollections, allDebitNotes, allCreditNotes) {
  const buyerIndents = allIndents.filter((i) => i.buyerId === buyer.id);
  const totalCollections = allCollections
    .filter((c) => c.buyerId === buyer.id)
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalDebitNotes = allDebitNotes
    .filter((n) => n.buyerId === buyer.id)
    .reduce((s, n) => s + (Number(n.amount) || 0), 0);
  const totalCreditNotes = allCreditNotes
    .filter((n) => n.buyerId === buyer.id)
    .reduce((s, n) => s + (Number(n.amount) || 0), 0);

  const totalSales = buyerIndents.reduce((s, i) => s + indentValue(i), 0);

  // Net outstanding = Sales + Debit Notes - Collections - Credit Notes
  const netOutstanding = totalSales + totalDebitNotes - totalCollections - totalCreditNotes;

  const allocation = allocateBuyerCollections(buyerIndents, totalCollections, buyer.creditDays || 0);

  const ageingTotals = { "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0 };
  allocation.forEach((a) => {
    if (a.bucket) ageingTotals[a.bucket] += a.balance;
  });
  // Debit/credit note adjustments aren't tied to a specific indent date,
  // so they're shown as a separate "Adjustments" line rather than aged.
  const adjustments = totalDebitNotes - totalCreditNotes;

  return {
    buyer,
    totalSales,
    totalCollections,
    totalDebitNotes,
    totalCreditNotes,
    adjustments,
    netOutstanding,
    allocation,
    ageingTotals,
  };
}

/* ---------- Commission rollups ---------- */
export function commissionForIndents(indents, buyers, collections) {
  // Groups indents by buyer, runs FIFO allocation per buyer, and returns
  // realized/accrued commission per indent — used by Dashboard & Reports.
  const byBuyer = {};
  indents.forEach((i) => {
    byBuyer[i.buyerId] = byBuyer[i.buyerId] || [];
    byBuyer[i.buyerId].push(i);
  });

  const results = [];
  Object.entries(byBuyer).forEach(([buyerId, buyerIndents]) => {
    const buyer = buyers.find((b) => b.id === buyerId);
    const totalCollections = collections
      .filter((c) => c.buyerId === buyerId)
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const allocation = allocateBuyerCollections(buyerIndents, totalCollections, buyer?.creditDays || 0);
    allocation.forEach((a) => results.push(a));
  });
  return results;
}
