// src/lib/whatsapp.js mein shareCollection function ko replace karein:

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