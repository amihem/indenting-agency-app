// src/lib/bulkImport.js
// Turns rows parsed from historical Excel sheets into the app's real data
// shape — resolving Buyer/Mill/Product names to IDs (auto-creating a
// minimal master record if no match is found, so nothing gets lost),
// matching Dispatch rows to their parent Indent by Indent No, and
// matching Payment rows to a specific pending invoice.

import { uid, todayISO } from "./storage";
import { computeInvoices, invoiceWithStatus } from "./calc";

function findOrCreateByName(list, name, makeExtra) {
  const trimmed = (name || "").trim();
  if (!trimmed) return { list, id: null };
  const existing = list.find((x) => (x.name || "").trim().toLowerCase() === trimmed.toLowerCase());
  if (existing) return { list, id: existing.id };
  const created = { id: uid(), name: trimmed, ...(makeExtra ? makeExtra() : {}) };
  return { list: [...list, created], id: created.id };
}

/* ---------------- 1. Indents ---------------- */
export function importIndentsIntoData(data, rows) {
  let mills = [...data.mills];
  let buyers = [...data.buyers];
  let products = [...data.products];
  const newIndents = [];
  const warnings = [];

  rows.forEach((r, idx) => {
    if (!r.buyerName || !r.millName || !r.productName) {
      warnings.push(`Row ${idx + 1}: missing Buyer/Mill/Product name — skipped.`);
      return;
    }
    let buyerId, millId, productId;
    ({ list: buyers, id: buyerId } = findOrCreateByName(buyers, r.buyerName));
    ({ list: mills, id: millId } = findOrCreateByName(mills, r.millName, () => ({ commissionPct: 0 })));
    ({ list: products, id: productId } = findOrCreateByName(products, r.productName, () => ({ unit: r.unit || "meters" })));

    newIndents.push({
      id: uid(),
      indentNumber: r.indentNumber || `IND-IMPORT-${uid()}`,
      date: r.date || todayISO(),
      buyerId,
      millId,
      productId,
      productName: r.productName,
      shade: r.shade,
      quantity: r.quantity,
      unit: r.unit || "meters",
      rate: r.rate,
      deliveryInstruction: r.deliveryInstruction,
      transport: r.transport,
      packingInstruction: r.packingInstruction,
      status: r.status || "fulfilled",
      dispatches: [],
    });
  });

  return {
    data: { ...data, mills, buyers, products, indents: [...newIndents, ...data.indents] },
    warnings,
    imported: newIndents.length,
  };
}

/* ---------------- 2. Dispatch ---------------- */
export function importDispatchesIntoData(data, rows) {
  const indents = data.indents.map((i) => ({ ...i, dispatches: [...(i.dispatches || [])] }));
  const warnings = [];
  let imported = 0;

  rows.forEach((r, idx) => {
    const indent = indents.find((i) => (i.indentNumber || "").trim().toLowerCase() === (r.indentNumber || "").trim().toLowerCase());
    if (!indent) {
      warnings.push(`Row ${idx + 1}: no Indent found with No. "${r.indentNumber}" — skipped.`);
      return;
    }
    indent.dispatches.push({
      id: uid(),
      date: r.date || todayISO(),
      qty: r.qty,
      invoiceNumber: r.invoiceNumber,
      invoiceDate: r.invoiceDate || r.date || todayISO(),
      lrNumber: r.lrNumber,
      lrDate: r.lrDate,
      transporter: r.transporter,
      freight: r.freight || 0,
    });
    imported += 1;
  });

  indents.forEach((i) => {
    const totalDispatched = (i.dispatches || []).reduce((s, d) => s + (Number(d.qty) || 0), 0);
    const ordered = Number(i.quantity) || 0;
    if (totalDispatched >= ordered && ordered > 0) i.status = "fulfilled";
    else if (totalDispatched > 0) i.status = "partial_dispatch";
  });

  return { data: { ...data, indents }, warnings, imported };
}

/* ---------------- 3 & 4. Debit / Credit Notes ---------------- */
function importNotesIntoData(data, rows, field) {
  let buyers = [...data.buyers];
  const warnings = [];
  const newNotes = [];

  rows.forEach((r, idx) => {
    if (!r.buyerName) {
      warnings.push(`Row ${idx + 1}: missing Buyer Name — skipped.`);
      return;
    }
    let buyerId;
    ({ list: buyers, id: buyerId } = findOrCreateByName(buyers, r.buyerName));
    newNotes.push({ id: uid(), buyerId, date: r.date || todayISO(), amount: r.amount, reason: r.reason });
  });

  return { data: { ...data, buyers, [field]: [...newNotes, ...data[field]] }, warnings, imported: newNotes.length };
}

export function importDebitNotesIntoData(data, rows) {
  return importNotesIntoData(data, rows, "debitNotes");
}
export function importCreditNotesIntoData(data, rows) {
  return importNotesIntoData(data, rows, "creditNotes");
}

/* ---------------- 5. Payments (Collections) ---------------- */
export function importPaymentsIntoData(data, rows) {
  let buyers = [...data.buyers];
  const newCollections = [];
  const warnings = [];

  rows.forEach((r, idx) => {
    if (!r.buyerName) {
      warnings.push(`Row ${idx + 1}: missing Buyer Name — skipped.`);
      return;
    }
    let buyerId;
    ({ list: buyers, id: buyerId } = findOrCreateByName(buyers, r.buyerName));

    // Recompute pending invoices for this buyer each time, factoring in
    // payments already imported earlier in this same batch.
    const invoices = computeInvoices(data.indents, data.mills)
      .filter((inv) => inv.buyerId === buyerId)
      .map((inv) => invoiceWithStatus(inv, [...data.collections, ...newCollections]))
      .filter((inv) => inv.balance > 0.5)
      .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));

    let target = null;
    if (r.againstInvoiceNo) {
      target = invoices.find(
        (inv) => (inv.invoiceNo || inv.indentNumber || "").trim().toLowerCase() === r.againstInvoiceNo.trim().toLowerCase()
      );
    }
    if (!target) target = invoices[0]; // FIFO fallback — oldest pending invoice

    if (!target) {
      warnings.push(`Row ${idx + 1}: no pending invoice found for "${r.buyerName}" — payment of ₹${r.amount} skipped.`);
      return;
    }

    const cdAmount = r.cdAmount != null ? r.cdAmount : Math.round((target.value * (r.cdPct || 0)) / 100);

    newCollections.push({
      id: uid(),
      buyerId,
      date: r.date || todayISO(),
      mode: r.mode || "NEFT",
      reference: r.reference,
      allocations: [
        {
          dispatchId: target.key,
          indentId: target.indentId,
          indentNumber: target.indentNumber,
          invoiceNo: target.invoiceNo,
          amount: r.amount,
          cdPct: r.cdPct || 0,
          cdAmount,
        },
      ],
    });
  });

  return {
    data: { ...data, buyers, collections: [...newCollections, ...data.collections] },
    warnings,
    imported: newCollections.length,
  };
}
