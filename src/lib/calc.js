// src/lib/calc.js
//
// CORE MODEL: a Dispatch entry now represents a Mill Invoice.
// "Sale" and "Commission" are recognized when goods are actually dispatched
// (invoiced) — not on the full ordered quantity — matching real trading
// practice: you can't bill or earn commission on goods not yet shipped.
//
// All business-rule math lives here in one place, so every screen
// (Dashboard, Reports, Ledger, Outstanding, Collections) uses the same numbers.

/* ---------- Indent-level (order) math — for the Indent tab table ---------- */
export function indentOrderValue(indent) {
  return (Number(indent.quantity) || 0) * (Number(indent.rate) || 0);
}

export function totalDispatchedQty(indent) {
  return (indent.dispatches || []).reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
}

export function pendingQty(indent) {
  const ordered = Number(indent.quantity) || 0;
  return Math.max(ordered - totalDispatchedQty(indent), 0);
}

/* ---------- Invoices (= dispatches) ---------- */
// Flattens every dispatch across every indent into one "invoice" record,
// carrying the buyer/mill/product/rate context it needs from its parent indent.
export function computeInvoices(indents, mills) {
  const millMap = Object.fromEntries((mills || []).map((m) => [m.id, m]));
  const invoices = [];

  (indents || []).forEach((indent) => {
    const mill = millMap[indent.millId];
    const commissionPct = Number(mill?.commissionPct) || 0;
    const rate = Number(indent.rate) || 0;

    (indent.dispatches || []).forEach((d) => {
      const qty = Number(d.qty) || 0;
      const value = qty * rate;
      invoices.push({
        key: d.id,
        dispatchId: d.id,
        indentId: indent.id,
        indentNumber: indent.indentNumber,
        indentDate: indent.date,
        buyerId: indent.buyerId,
        millId: indent.millId,
        productName: indent.productName,
        unit: indent.unit,
        invoiceDate: d.invoiceDate || d.date,
        invoiceNo: d.invoiceNumber || "",
        lrNo: d.lrNumber || "",
        lrDate: d.lrDate || "",
        transporter: d.transporter || "",
        dispatchDate: d.date,
        qty,
        rate,
        value,
        commissionPct,
        commission: (value * commissionPct) / 100,
      });
    });
  });

  return invoices;
}

export function ageDays(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const today = new Date();
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
}

/* ---------- Cash Discount (CD) policy ---------- */
// Tiers are configurable in the Collections tab. Each tier: { minDays, maxDays, pct }.
// If the payment date falls in none of the tiers, CD = 0%.
export function calcCdPct(days, cdPolicy) {
  const tiers = cdPolicy?.tiers || [];
  for (const t of tiers) {
    if (days >= Number(t.minDays) && days <= Number(t.maxDays)) return Number(t.pct) || 0;
  }
  return 0;
}

/* ---------- How much of an invoice has been paid (cash + CD) ---------- */
export function invoiceAllocatedTotals(invoiceKey, collections) {
  let cash = 0;
  let cd = 0;
  (collections || []).forEach((c) => {
    (c.allocations || []).forEach((a) => {
      if (a.dispatchId === invoiceKey) {
        cash += Number(a.amount) || 0;
        cd += Number(a.cdAmount) || 0;
      }
    });
  });
  return { cash, cd, total: cash + cd };
}

export function invoiceWithStatus(invoice, collections) {
  const { cash, cd, total } = invoiceAllocatedTotals(invoice.key, collections);
  const balance = Math.max(invoice.value - total, 0);
  const paidRatio = invoice.value > 0 ? total / invoice.value : 0;
  return {
    ...invoice,
    paidCash: cash,
    paidCD: cd,
    paidTotal: total,
    balance,
    days: ageDays(invoice.invoiceDate),
    commissionRealized: invoice.commission * paidRatio,
    commissionAccrued: invoice.commission * (1 - paidRatio),
  };
}

/* ---------- Buyer outstanding (invoice-wise) ---------- */
export function buyerOutstandingInvoices(buyerId, indents, mills, collections) {
  const invoices = computeInvoices(indents, mills).filter((i) => i.buyerId === buyerId);
  return invoices
    .map((inv) => invoiceWithStatus(inv, collections))
    .filter((inv) => inv.balance > 0.5)
    .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
}

/* ---------- Mill-wise pending amount (across all buyers) ---------- */
export function millOutstandingSummary(indents, mills, collections) {
  const invoices = computeInvoices(indents, mills);
  const byMill = {};
  invoices.forEach((inv) => {
    const withStatus = invoiceWithStatus(inv, collections);
    if (withStatus.balance > 0.5) {
      byMill[inv.millId] = (byMill[inv.millId] || 0) + withStatus.balance;
    }
  });
  return byMill; // { millId: totalPendingAmount }
}

/* ---------- Pending invoices for a buyer, for the Collection-entry screen ---------- */
export function pendingInvoicesForCollectionEntry(buyerId, indents, mills, collections, cdPolicy) {
  return buyerOutstandingInvoices(buyerId, indents, mills, collections).map((inv) => ({
    ...inv,
    suggestedCdPct: calcCdPct(inv.days, cdPolicy),
  }));
}

/* ---------- Account Ledger (Buyer or Mill) ----------
   Debit = Mill Invoice value + Debit Notes (buyer only)
   Credit = Collections + CD amount + Credit Notes (buyer only)
------------------------------------------------------- */
export function ledgerEntries({ entityType, entityId, indents, mills, collections, debitNotes, creditNotes }) {
  const invoices = computeInvoices(indents, mills).filter((inv) =>
    entityType === "buyer" ? inv.buyerId === entityId : inv.millId === entityId
  );

  const entries = [];

  invoices.forEach((inv) => {
    entries.push({
      date: inv.invoiceDate,
      particular: `Mill Invoice ${inv.invoiceNo || "(no number)"} — Indent ${inv.indentNumber}`,
      debit: inv.value,
      credit: 0,
    });
  });

  if (entityType === "buyer") {
    (debitNotes || [])
      .filter((n) => n.buyerId === entityId)
      .forEach((n) =>
        entries.push({
          date: n.date,
          particular: `Debit Note${n.reason ? " — " + n.reason : ""}`,
          debit: Number(n.amount) || 0,
          credit: 0,
        })
      );
    (creditNotes || [])
      .filter((n) => n.buyerId === entityId)
      .forEach((n) =>
        entries.push({
          date: n.date,
          particular: `Credit Note${n.reason ? " — " + n.reason : ""}`,
          debit: 0,
          credit: Number(n.amount) || 0,
        })
      );
  }

  (collections || []).forEach((c) => {
    (c.allocations || []).forEach((a) => {
      const inv = invoices.find((i) => i.key === a.dispatchId);
      if (!inv) return; // allocation belongs to an invoice outside this entity's scope
      entries.push({
        date: c.date,
        particular: `Collection (${c.mode}${c.reference ? " · " + c.reference : ""}) — Inv ${
          inv.invoiceNo || inv.indentNumber
        }`,
        debit: 0,
        credit: Number(a.amount) || 0,
      });
      if (Number(a.cdAmount) > 0.5) {
        entries.push({
          date: c.date,
          particular: `CD ${a.cdPct}% — Inv ${inv.invoiceNo || inv.indentNumber}`,
          debit: 0,
          credit: Number(a.cdAmount) || 0,
        });
      }
    });
  });

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  return entries.map((e) => {
    running += e.debit - e.credit;
    return { ...e, balanceAmt: e.debit - e.credit, runningBalance: running };
  });
}
