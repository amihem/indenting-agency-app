// src/lib/calc.js

// Helper: Round to nearest rupee
export const roundRupee = (val) => Math.round(Number(val) || 0);

/* ---------- Indent-level (order) math ---------- */
export function indentOrderValue(indent) {
  return roundRupee((Number(indent.quantity) || 0) * (Number(indent.rate) || 0));
}

/* ---------- Dispatch financials: Freight + 5% GST + auto Round Off ---------- */
export function computeDispatchFinancials(value, freight) {
  const v = Number(value) || 0;
  const f = roundRupee(freight);
  const gstExact = (v + f) * 0.05; // 5% GST on (Taxable Value + Freight)
  const gst = roundRupee(gstExact);
  const grandTotal = roundRupee(v + f + gstExact);
  const roundOff = grandTotal - (v + f + gst); // auto adjustment so columns tie back to Grand Total
  return { freight: f, gst, roundOff, grandTotal };
}

export function totalDispatchedQty(indent) {
  return (indent.dispatches || []).reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
}

export function pendingQty(indent) {
  const ordered = Number(indent.quantity) || 0;
  return Math.max(ordered - totalDispatchedQty(indent), 0);
}

/* ---------- Invoices (= dispatches) ---------- */
export function computeInvoices(indents, mills) {
  const millMap = Object.fromEntries((mills || []).map((m) => [m.id, m]));
  const invoices = [];

  (indents || []).forEach((indent) => {
    const mill = millMap[indent.millId];
    const commissionPct = Number(mill?.commissionPct) || 0;
    const rate = Number(indent.rate) || 0;

    (indent.dispatches || []).forEach((d) => {
      const qty = Number(d.qty) || 0;
      const value = roundRupee(qty * rate);
      const { freight, gst, roundOff, grandTotal } = computeDispatchFinancials(value, d.freight);
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
        rolls: d.rolls || "", // Added for Dispatch Tab
        rate,
        value,
        freight,
        gst,
        roundOff,
        grandTotal,
        commissionPct,
        commission: roundRupee((value * commissionPct) / 100),
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

export function calcCdPct(days, cdPolicy) {
  const tiers = cdPolicy?.tiers || [];
  for (const t of tiers) {
    if (days >= Number(t.minDays) && days <= Number(t.maxDays)) return Number(t.pct) || 0;
  }
  return 0;
}

/* ---------- Allocation Totals ---------- */
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
  return { cash: roundRupee(cash), cd: roundRupee(cd), total: roundRupee(cash + cd) };
}

/* ---------- SINGLE SOURCE OF TRUTH HELPERS ---------- */
export function invoiceWithStatus(invoice, collections) {
  const { cash, cd, total } = invoiceAllocatedTotals(invoice.key, collections);
  const balance = Math.max(invoice.value - total, 0);
  
  // COMMISSION RULE: Only on actual cash received. Exclude CD.
  const paidCashRatio = invoice.value > 0 ? (cash / invoice.value) : 0;
  const realized = roundRupee(invoice.commission * paidCashRatio);

  return {
    ...invoice,
    paidCash: cash,
    paidCD: cd,
    paidTotal: total,
    balance: roundRupee(balance),
    days: ageDays(invoice.invoiceDate),
    commissionRealized: realized,
    commissionAccrued: roundRupee(invoice.commission - realized),
  };
}

export const getDashboardSummary = (data) => {
  const invoices = computeInvoices(data.indents, data.mills).map(inv => invoiceWithStatus(inv, data.collections));
  
  let totalSale = 0;
  let totalCommissionRealized = 0;
  let totalCommissionAccrued = 0;
  let overdueOutstanding = 0;

  invoices.forEach(inv => {
    totalSale += inv.value;
    totalCommissionRealized += inv.commissionRealized;
    totalCommissionAccrued += inv.commissionAccrued;
    if (inv.balance > 0 && inv.days > 30) {
        overdueOutstanding += inv.balance;
    }
  });

  // Collections (Cash vs CD)
  let totalCollectionCash = 0;
  let totalCD = 0;
  let todaysCollection = 0;
  let thisMonthCollection = 0;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth();

  data.collections.forEach(c => {
    const isToday = c.date === todayStr;
    const isThisMonth = new Date(c.date).getMonth() === currentMonth;

    (c.allocations || []).forEach(a => {
      const cashAmt = roundRupee(a.amount);
      const cdAmt = roundRupee(a.cdAmount);
      
      totalCollectionCash += cashAmt;
      totalCD += cdAmt;

      if (isToday) todaysCollection += cashAmt;
      if (isThisMonth) thisMonthCollection += cashAmt;
    });
  });

  // Calculate Notes
  const totalDebitNotes = (data.debitNotes || []).reduce((sum, n) => sum + roundRupee(n.amount), 0);
  const totalCreditNotes = (data.creditNotes || []).reduce((sum, n) => sum + roundRupee(n.amount), 0);

  // OUTSTANDING RULE: Invoice - Cash - CD - Credit Notes + Debit Notes
  const outstanding = roundRupee(totalSale - totalCollectionCash - totalCD - totalCreditNotes + totalDebitNotes);

  // Dispatch Metrics
  let pendingDispatchQty = 0;
  let pendingDispatchValue = 0;
  (data.indents || []).forEach(i => {
    if (!["cancelled", "closed"].includes(i.status)) {
        const pQty = pendingQty(i);
        pendingDispatchQty += pQty;
        pendingDispatchValue += roundRupee(pQty * (Number(i.rate) || 0));
    }
  });

  return {
    totalSale,
    totalCollectionCash,
    totalCD,
    outstanding,
    overdueOutstanding,
    totalCommissionRealized,
    totalCommissionAccrued,
    pendingDispatchQty,
    pendingDispatchValue,
    todaysCollection,
    thisMonthCollection,
    invoices
  };
};

export const getAgeingSummary = (invoices) => {
    const buckets = { current: 0, '0-30': 0, '31-60': 0, '61-90': 0, '91-120': 0, '120+': 0 };
    invoices.forEach(inv => {
        if (inv.balance <= 0) return;
        if (inv.days <= 0) buckets.current += inv.balance;
        else if (inv.days <= 30) buckets['0-30'] += inv.balance;
        else if (inv.days <= 60) buckets['31-60'] += inv.balance;
        else if (inv.days <= 90) buckets['61-90'] += inv.balance;
        else if (inv.days <= 120) buckets['91-120'] += inv.balance;
        else buckets['120+'] += inv.balance;
    });
    return buckets;
};

export const getCustomerAgeingSummary = (invoices, buyers) => {
  const emptyBuckets = () => ({ current: 0, "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0, total: 0 });
  const byBuyer = {};

  invoices.forEach((inv) => {
    if (inv.balance <= 0) return;
    if (!byBuyer[inv.buyerId]) byBuyer[inv.buyerId] = emptyBuckets();
    const b = byBuyer[inv.buyerId];
    if (inv.days <= 0) b.current += inv.balance;
    else if (inv.days <= 30) b["0-30"] += inv.balance;
    else if (inv.days <= 60) b["31-60"] += inv.balance;
    else if (inv.days <= 90) b["61-90"] += inv.balance;
    else if (inv.days <= 120) b["91-120"] += inv.balance;
    else b["120+"] += inv.balance;
    b.total += inv.balance;
  });

  const buyerName = (id) => (buyers || []).find((x) => x.id === id)?.name || "Unknown";

  const rows = Object.entries(byBuyer)
    .map(([buyerId, buckets]) => ({ buyerId, buyerName: buyerName(buyerId), ...buckets }))
    .sort((a, b) => b.total - a.total);

  const grand = rows.reduce(
    (acc, r) => {
      acc.current += r.current;
      acc["0-30"] += r["0-30"];
      acc["31-60"] += r["31-60"];
      acc["61-90"] += r["61-90"];
      acc["91-120"] += r["91-120"];
      acc["120+"] += r["120+"];
      acc.total += r.total;
      return acc;
    },
    emptyBuckets()
  );

  return { rows, grand };
};

/* ---------- Rest of the original functions (Ledger, Outstanding etc.) ---------- */
export function buyerOutstandingInvoices(buyerId, indents, mills, collections) {
  const invoices = computeInvoices(indents, mills).filter((i) => i.buyerId === buyerId);
  return invoices
    .map((inv) => invoiceWithStatus(inv, collections))
    .filter((inv) => inv.balance > 0.5)
    .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
}

export function millOutstandingSummary(indents, mills, collections) {
  const invoices = computeInvoices(indents, mills);
  const byMill = {};
  invoices.forEach((inv) => {
    const withStatus = invoiceWithStatus(inv, collections);
    if (withStatus.balance > 0.5) {
      byMill[inv.millId] = roundRupee((byMill[inv.millId] || 0) + withStatus.balance);
    }
  });
  return byMill;
}

export function millOutstandingInvoices(millId, indents, mills, collections) {
  const invoices = computeInvoices(indents, mills).filter((i) => i.millId === millId);
  return invoices
    .map((inv) => invoiceWithStatus(inv, collections))
    .filter((inv) => inv.balance > 0.5)
    .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
}

export function pendingInvoicesForCollectionEntry(buyerId, indents, mills, collections, cdPolicy) {
  return buyerOutstandingInvoices(buyerId, indents, mills, collections).map((inv) => ({
    ...inv,
    suggestedCdPct: calcCdPct(inv.days, cdPolicy),
  }));
}

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
          debit: roundRupee(n.amount),
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
          credit: roundRupee(n.amount),
        })
      );
  }

  (collections || []).forEach((c) => {
    (c.allocations || []).forEach((a) => {
      const inv = invoices.find((i) => i.key === a.dispatchId);
      if (!inv) return;
      entries.push({
        date: c.date,
        particular: `Collection (${c.mode}${c.reference ? " · " + c.reference : ""}) — Inv ${
          inv.invoiceNo || inv.indentNumber
        }`,
        debit: 0,
        credit: roundRupee(a.amount),
      });
      if (Number(a.cdAmount) > 0.5) {
        entries.push({
          date: c.date,
          particular: `CD ${a.cdPct || 'Adjusted'}% — Inv ${inv.invoiceNo || inv.indentNumber}`,
          debit: 0,
          credit: roundRupee(a.cdAmount),
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