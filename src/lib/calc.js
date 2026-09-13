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
      const unitValue = Math.round(qty * rate);
      const freight = Number(d.freight) || 0;
      const gstBase = unitValue + freight;
      const gstAmount = Math.round(gstBase * 0.05 * 100) / 100; // 5% GST on (unit value + freight)
      const subtotal = unitValue + freight + gstAmount;
      const calculatedValue = Math.round(subtotal); // what the app's formula produces
      const roundOff = Math.round((calculatedValue - subtotal) * 100) / 100;
      const commission = Math.round(unitValue * (commissionPct / 100)); // commission on goods value only, not GST/freight

      // If the real mill invoice differs from our formula (different GST
      // rate, extra charges, their own rounding, etc.), enter the actual
      // amount here — everything downstream (Outstanding, Ledger, Reports)
      // then uses that real figure, while `variance` shows the gap for review.
      const hasActual = d.actualInvoiceValue !== undefined && d.actualInvoiceValue !== null && d.actualInvoiceValue !== "";
      const actualValue = hasActual ? Math.round(Number(d.actualInvoiceValue)) : null;
      const invoiceValue = hasActual ? actualValue : calculatedValue;
      const variance = hasActual ? actualValue - calculatedValue : 0;

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
        unitValue,
        freight,
        gstAmount,
        roundOff,
        calculatedValue,
        actualValue,
        hasActual,
        variance,
        value: invoiceValue,
        commissionPct,
        commission,
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

/* ---------- Simple rupee rounding helper (used across Collections screen) ---------- */
export function roundRupee(amount) {
  return Math.round(Number(amount) || 0);
}

/* ---------- Dashboard summary (totals across all invoices) ---------- */
export function getDashboardSummary(data) {
  const invoices = computeInvoices(data?.indents, data?.mills).map((inv) =>
    invoiceWithStatus(inv, data?.collections)
  );

  const base = invoices.reduce(
    (acc, inv) => {
      acc.totalSale += inv.value;
      acc.totalPaid += inv.paidTotal;
      acc.totalCommissionRealized += inv.commissionRealized;
      acc.totalCommissionAccrued += inv.commissionAccrued;
      return acc;
    },
    { totalSale: 0, totalPaid: 0, totalCommissionRealized: 0, totalCommissionAccrued: 0 }
  );

  // Outstanding must reconcile with the Ledger/Outstanding tab — so it's
  // computed the same way (net of Debit/Credit Notes), not just raw invoice balances.
  const maxCreditDays = data?.settings?.cdPolicy?.maxCreditDays || 120;
  let outstanding = 0;
  let overdueOutstanding = 0;
  (data?.buyers || []).forEach((buyer) => {
    const rows = buyerOutstandingInvoices(buyer.id, data?.indents, data?.mills, data?.collections, data?.debitNotes, data?.creditNotes);
    rows.forEach((r) => {
      outstanding += r.balance;
      if (r.days > maxCreditDays) overdueOutstanding += r.balance;
    });
  });

  const pendingDispatchValue = (data?.indents || []).reduce(
    (s, i) => s + pendingQty(i) * (Number(i.rate) || 0),
    0
  );

  return { ...base, outstanding, overdueOutstanding, pendingDispatchValue };
}

/* ---------- Buyer outstanding (invoice-wise) ----------
   IMPORTANT: this must reconcile exactly with the Ledger's running balance.
   Debit/Credit Notes aren't tied to a specific mill invoice, so:
   - Credit Notes are applied FIFO against the oldest outstanding invoice
     balances first (same principle as a payment reducing old dues first).
   - Debit Notes add to what the buyer owes; since they don't belong to any
     one invoice, they're shown as their own dated rows.
------------------------------------------------------------------------ */
export function buyerOutstandingInvoices(buyerId, indents, mills, collections, debitNotes = [], creditNotes = []) {
  const invoices = computeInvoices(indents, mills)
    .filter((i) => i.buyerId === buyerId)
    .map((inv) => invoiceWithStatus(inv, collections))
    .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));

  const totalCreditNotes = (creditNotes || [])
    .filter((n) => n.buyerId === buyerId)
    .reduce((s, n) => s + (Number(n.amount) || 0), 0);

  let creditPool = totalCreditNotes;
  const withCreditNotesApplied = invoices.map((inv) => {
    const applied = Math.min(creditPool, inv.balance);
    creditPool -= applied;
    return { ...inv, creditNoteApplied: applied, balance: inv.balance - applied };
  });

  const invoiceRows = withCreditNotesApplied.filter((inv) => inv.balance > 0.5);

  const debitNoteRows = (debitNotes || [])
    .filter((n) => n.buyerId === buyerId)
    .map((n) => ({
      key: `dn-${n.id}`,
      isDebitNote: true,
      dispatchId: null,
      indentId: null,
      indentNumber: "",
      invoiceDate: n.date,
      invoiceNo: `Debit Note${n.reason ? " — " + n.reason : ""}`,
      value: Number(n.amount) || 0,
      paidTotal: 0,
      balance: Number(n.amount) || 0,
      commission: 0,
      commissionRealized: 0,
      commissionAccrued: 0,
      days: ageDays(n.date),
    }));

  return [...invoiceRows, ...debitNoteRows]
    .filter((r) => r.balance > 0.5)
    .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
}

/* ---------- Ageing buckets (for Reports: Customer-wise Outstanding Ageing) ---------- */
export const AGEING_BUCKETS = ["0-30", "31-60", "61-90", "91-120", "120+"];

export function ageBucket(days) {
  const d = Math.max(days, 0);
  if (d <= 30) return "0-30";
  if (d <= 60) return "31-60";
  if (d <= 90) return "61-90";
  if (d <= 120) return "91-120";
  return "120+";
}

export function customerWiseAgeing(buyers, indents, mills, collections, debitNotes = [], creditNotes = []) {
  return buyers
    .map((buyer) => {
      const invoices = buyerOutstandingInvoices(buyer.id, indents, mills, collections, debitNotes, creditNotes);
      const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0 };
      invoices.forEach((inv) => {
        buckets[ageBucket(inv.days)] += inv.balance;
      });
      const total = invoices.reduce((s, i) => s + i.balance, 0);
      return { buyer, buckets, total };
    })
    .filter((x) => x.total > 0.5);
}

/* ---------- Mill-wise pending amount (across all buyers) ---------- */
export function millOutstandingSummary(indents, mills, collections, buyers = [], debitNotes = [], creditNotes = []) {
  const byMill = {};
  buyers.forEach((buyer) => {
    buyerOutstandingInvoices(buyer.id, indents, mills, collections, debitNotes, creditNotes)
      .filter((inv) => !inv.isDebitNote) // a buyer's Debit Note isn't owed to any mill
      .forEach((inv) => {
        byMill[inv.millId] = (byMill[inv.millId] || 0) + inv.balance;
      });
  });
  return byMill; // { millId: totalPendingAmount }
}

/* ---------- Mill-wise pending, broken down date/invoice/party-wise ---------- */
export function millOutstandingInvoices(millId, indents, mills, collections, buyers = [], debitNotes = [], creditNotes = []) {
  const rows = [];
  buyers.forEach((buyer) => {
    buyerOutstandingInvoices(buyer.id, indents, mills, collections, debitNotes, creditNotes)
      .filter((inv) => !inv.isDebitNote && inv.millId === millId)
      .forEach((inv) => rows.push(inv));
  });
  return rows.sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
}

/* ---------- Pending invoices for a buyer, for the Collection-entry screen ---------- */
export function pendingInvoicesForCollectionEntry(buyerId, indents, mills, collections, cdPolicy, debitNotes = [], creditNotes = []) {
  return buyerOutstandingInvoices(buyerId, indents, mills, collections, debitNotes, creditNotes)
    .filter((inv) => !inv.isDebitNote) // debit notes aren't a mill invoice — nothing to allocate a payment against
    .map((inv) => ({
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

/* ---------- Data Health Check: duplicate Mill Invoice Numbers ----------
   The same buyer's mill sometimes reuses an invoice number across two
   separate dispatches. When that happens, a payment recorded "against
   Invoice No. X" is ambiguous — historically this caused all money to be
   misattributed to just one of the two dispatches, leaving the other one
   looking unpaid even though it may have genuinely been settled. This
   surfaces every such case so it can be checked and corrected in Collections.
------------------------------------------------------------------------- */
export function findDuplicateInvoiceNumbers(indents) {
  const groups = {};
  (indents || []).forEach((indent) => {
    (indent.dispatches || []).forEach((d) => {
      const invNo = (d.invoiceNumber || "").trim();
      if (!invNo) return;
      const key = `${indent.buyerId}::${invNo.toLowerCase()}`;
      if (!groups[key]) groups[key] = { buyerId: indent.buyerId, invoiceNo: invNo, entries: [] };
      groups[key].entries.push({
        dispatchId: d.id,
        indentNumber: indent.indentNumber,
        date: d.date,
        qty: d.qty,
        rate: indent.rate,
      });
    });
  });
  return Object.values(groups).filter((g) => g.entries.length > 1);
}
