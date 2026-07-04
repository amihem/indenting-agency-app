// src/lib/whatsapp.js
// Every "Share on WhatsApp" button in the app funnels through these functions.
// Uses the wa.me URL scheme — opens the WhatsApp app on mobile, WhatsApp Web on desktop.

import { formatINR, formatDate } from "./storage";
import { indentValue } from "./calc";

function openWhatsApp(phone, text) {
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

export function shareIndent(indent, buyer, mill) {
  const value = indentValue(indent);
  const text =
    `*Indent ${indent.indentNumber}*\n` +
    `Date: ${formatDate(indent.date)}\n` +
    `Buyer: ${buyer?.name || "—"}\n` +
    `Mill: ${mill?.name || "—"}\n` +
    `Product: ${indent.productName}\n` +
    `Qty: ${indent.quantity} ${indent.unit}\n` +
    `Rate: ${formatINR(indent.rate)}\n` +
    `Total Value: ${formatINR(value)}\n` +
    `Status: ${indent.status}`;
  openWhatsApp(buyer?.phone, text);
}

export function shareDispatch(indent, dispatch, buyer) {
  const text =
    `*Dispatch Update — Indent ${indent.indentNumber}*\n` +
    `Date: ${formatDate(dispatch.date)}\n` +
    `Product: ${indent.productName}\n` +
    `Qty Dispatched: ${dispatch.qty} ${indent.unit}\n` +
    (dispatch.lrNumber ? `LR Number: ${dispatch.lrNumber}\n` : "") +
    (dispatch.transporter ? `Transporter: ${dispatch.transporter}\n` : "") +
    (dispatch.invoiceNumber ? `Mill Invoice: ${dispatch.invoiceNumber}\n` : "");
  openWhatsApp(buyer?.phone, text);
}

export function shareOutstanding(summary) {
  const { buyer, totalSales, totalCollections, netOutstanding, ageingTotals } = summary;
  let text =
    `*Outstanding Statement — ${buyer.name}*\n` +
    `As on: ${formatDate(new Date().toISOString())}\n\n` +
    `Total Sales: ${formatINR(totalSales)}\n` +
    `Total Collections: ${formatINR(totalCollections)}\n` +
    `*Net Outstanding: ${formatINR(netOutstanding)}*\n\n` +
    `Ageing:\n`;
  Object.entries(ageingTotals).forEach(([bucket, amt]) => {
    if (amt > 0.5) text += `  ${bucket} days: ${formatINR(amt)}\n`;
  });
  openWhatsApp(buyer.phone, text);
}
