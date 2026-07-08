// src/lib/whatsapp.js
// Every "Share on WhatsApp" button in the app funnels through these functions.
// Uses the wa.me URL scheme — opens the WhatsApp app on mobile, WhatsApp Web on desktop.

import { formatINR, formatDate } from "./storage";
import { indentOrderValue } from "./calc";

function openWhatsApp(phone, text) {
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

export function shareIndent(indent, buyer, mill) {
  const value = indentOrderValue(indent);
  const text =
    `*Indent ${indent.indentNumber}*\n` +
    `Date: ${formatDate(indent.date)}\n` +
    `Buyer: ${buyer?.name || "—"}\n` +
    `Mill: ${mill?.name || "—"}\n` +
    `Product: ${indent.productName}\n` +
    `Qty: ${indent.quantity} ${indent.unit}\n` +
    `Rate: ${formatINR(indent.rate)}\n` +
    `Order Value: ${formatINR(value)}\n` +
    (indent.deliveryInstruction ? `Delivery Instruction: ${indent.deliveryInstruction}\n` : "") +
    (indent.transport ? `Transport: ${indent.transport}\n` : "") +
    (indent.packingInstruction ? `Packing Instruction: ${indent.packingInstruction}\n` : "") +
    (indent.remark ? `Remark: ${indent.remark}\n` : "") +
    `Status: ${indent.status}`;
  openWhatsApp(buyer?.phone, text);
}

export function shareDispatch(indent, dispatch, buyer) {
  const text =
    `*Dispatch Update — Indent ${indent.indentNumber}*\n` +
    `Dispatch Date: ${formatDate(dispatch.date)}\n` +
    `Product: ${indent.productName}\n` +
    `Qty Dispatched: ${dispatch.qty} ${indent.unit}\n` +
    (dispatch.invoiceNumber ? `Mill Invoice No: ${dispatch.invoiceNumber}\n` : "") +
    (dispatch.invoiceDate ? `Invoice Date: ${formatDate(dispatch.invoiceDate)}\n` : "") +
    (dispatch.lrNumber ? `LR Number: ${dispatch.lrNumber}\n` : "") +
    (dispatch.lrDate ? `LR Date: ${formatDate(dispatch.lrDate)}\n` : "") +
    (dispatch.transporter ? `Transporter: ${dispatch.transporter}\n` : "");
  openWhatsApp(buyer?.phone, text);
}

export function shareOutstanding(buyer, invoices, partyTotal) {
  let text = `*Outstanding Statement — ${buyer.name}*\nAs on: ${formatDate(new Date().toISOString())}\n\n`;
  invoices.forEach((inv) => {
    text += `${formatDate(inv.invoiceDate)} · Inv ${inv.invoiceNo || inv.indentNumber} · Bal: ${formatINR(
      inv.balance
    )} · ${inv.days}d\n`;
  });
  text += `\n*Total Outstanding: ${formatINR(partyTotal)}*`;
  openWhatsApp(buyer.phone, text);
}

export function shareCollection(collection, buyer) {
  // Now explicitly separating Cash and CD in the message and rounding to nearest rupee
  const cashReceived = (collection.allocations || []).reduce((s, a) => s + Math.round(Number(a.amount) || 0), 0);
  const cdGiven = (collection.allocations || []).reduce((s, a) => s + Math.round(Number(a.cdAmount) || 0), 0);

  let text =
    `*Payment Received Confirmation*\n` +
    `Date: ${formatDate(collection.date)}\n` +
    `From: ${buyer?.name || "—"}\n` +
    `Mode: ${collection.mode}${collection.reference ? " · Ref: " + collection.reference : ""}\n` +
    `Cash Received: ${formatINR(cashReceived)}\n` +
    (cdGiven > 0 ? `CD Allowed: ${formatINR(cdGiven)}\n` : "") +
    `\nApplied against:\n`;
    
  (collection.allocations || []).forEach((a) => {
    text += `  Inv ${a.invoiceNo || ""}: ${formatINR(a.amount)}${
      a.cdAmount > 0.5 ? ` + CD ${a.cdPct || 'Adjusted'}% (${formatINR(a.cdAmount)})` : ""
    }\n`;
  });
  openWhatsApp(buyer?.phone, text);
}