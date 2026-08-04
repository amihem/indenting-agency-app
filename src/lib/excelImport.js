// src/lib/excelImport.js
// Reads an uploaded .xlsx/.xls/.csv file and turns it into plain JS objects
// (one per row). Column name matching is flexible — "Phone", "Mobile",
// "Mobile No" etc. are all understood, so messy real-world sheets still work.

import * as XLSX from "xlsx";

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(new Error("Could not read this file. Please check it's a valid Excel/CSV file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsArrayBuffer(file);
  });
}

// Converts a cell value (JS Date, "DD-MM-YYYY", "DD/MM/YYYY", or ISO string)
// into a clean "YYYY-MM-DD" string the app uses everywhere.
export function toISODate(value) {
  if (!value) return "";
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  if (!str) return "";
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = "20" + y;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return "";
}

// Looks up a value in a row by trying several possible header spellings,
// case-insensitively, ignoring extra spaces.
function pick(row, aliases) {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const found = rowKeys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
    if (found && row[found] !== "") return row[found];
  }
  return "";
}

export function mapMillRow(row) {
  return {
    name: String(pick(row, ["Name", "Mill Name", "Supplier", "Supplier Name"])).trim(),
    phone: String(pick(row, ["Phone", "Mobile", "Mobile No", "Contact"])).trim(),
    address: String(pick(row, ["Address", "Full Address"])).trim(),
    gst: String(pick(row, ["GST", "GST Number", "GSTIN"])).trim(),
    commissionPct: pick(row, ["Commission%", "Commission Pct", "Commission", "Commission %"]),
    paymentTerms: String(pick(row, ["Payment Terms", "Terms"])).trim(),
  };
}

export function mapBuyerRow(row) {
  return {
    name: String(pick(row, ["Name", "Buyer Name", "Customer", "Customer Name", "Business Name"])).trim(),
    phone: String(pick(row, ["Phone", "Mobile", "Mobile No", "Contact"])).trim(),
    address: String(pick(row, ["Address", "Full Address"])).trim(),
    gst: String(pick(row, ["GST", "GST Number", "GSTIN"])).trim(),
    creditDays: pick(row, ["Credit Days", "Credit Period"]),
  };
}

export function mapProductRow(row) {
  return {
    name: String(pick(row, ["Product Name", "Name", "Product", "Quality", "Quality Name"])).trim(),
    unit: String(pick(row, ["Unit"])).trim() || "meters",
    commercialNo: String(pick(row, ["Commercial No", "Commercial Number"])).trim(),
    dying: String(pick(row, ["Dying"])).trim(),
    type: String(pick(row, ["Type"])).trim(),
    weightGLM: pick(row, ["GLM", "Weight GLM", "Weight (GLM)"]),
    width: pick(row, ["Width", "Width (inches)"]),
    finish: String(pick(row, ["Finish"])).trim(),
    packing: String(pick(row, ["Packing"])).trim(),
  };
}

/* ---------------- Historical transaction imports ---------------- */

export function mapIndentRow(row) {
  return {
    indentNumber: String(pick(row, ["Indent No", "Indent Number"])).trim(),
    date: toISODate(pick(row, ["Indent Date", "Date"])),
    buyerName: String(pick(row, ["Buyer Name", "Buyer"])).trim(),
    millName: String(pick(row, ["Mill Name", "Mill", "Supplier Name", "Supplier"])).trim(),
    productName: String(pick(row, ["Product Name", "Product"])).trim(),
    shade: String(pick(row, ["Shade", "Shade / Dyeing", "Dyeing"])).trim(),
    quantity: Number(pick(row, ["Order Qty", "Qty", "Quantity"])) || 0,
    unit: String(pick(row, ["Unit"])).trim() || "meters",
    rate: Number(pick(row, ["Rate"])) || 0,
    deliveryInstruction: String(pick(row, ["Delivery Instruction"])).trim(),
    transport: String(pick(row, ["Transport"])).trim(),
    packingInstruction: String(pick(row, ["Packing Instruction"])).trim(),
    status: String(pick(row, ["Status"])).trim().toLowerCase() || "fulfilled",
  };
}

export function mapDispatchRow(row) {
  return {
    indentNumber: String(pick(row, ["Indent No", "Indent Number"])).trim(),
    date: toISODate(pick(row, ["Dispatch Date", "Date"])),
    qty: Number(pick(row, ["Qty", "Quantity"])) || 0,
    invoiceNumber: String(pick(row, ["Mill Invoice No", "Invoice No", "Mill Invoice Number"])).trim(),
    invoiceDate: toISODate(pick(row, ["Invoice Date"])),
    lrNumber: String(pick(row, ["LR No", "LR Number"])).trim(),
    lrDate: toISODate(pick(row, ["LR Date"])),
    transporter: String(pick(row, ["Transporter"])).trim(),
    freight: Number(pick(row, ["Freight"])) || 0,
  };
}

export function mapDebitNoteRow(row) {
  return {
    buyerName: String(pick(row, ["Buyer Name", "Buyer"])).trim(),
    date: toISODate(pick(row, ["Date"])),
    amount: Number(pick(row, ["Amount"])) || 0,
    reason: String(pick(row, ["Reason"])).trim(),
  };
}

export const mapCreditNoteRow = mapDebitNoteRow;

export function mapPaymentRow(row) {
  const cdAmountRaw = pick(row, ["CD Amount"]);
  return {
    buyerName: String(pick(row, ["Buyer Name", "Buyer"])).trim(),
    date: toISODate(pick(row, ["Date"])),
    amount: Number(pick(row, ["Amount"])) || 0,
    mode: String(pick(row, ["Mode"])).trim() || "NEFT",
    reference: String(pick(row, ["Reference"])).trim(),
    againstInvoiceNo: String(pick(row, ["Against Invoice No", "Invoice No"])).trim(),
    cdPct: Number(pick(row, ["CD %", "CD Pct"])) || 0,
    cdAmount: cdAmountRaw !== "" ? Number(cdAmountRaw) : null,
  };
}
