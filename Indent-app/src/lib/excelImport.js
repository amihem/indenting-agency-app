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
        const workbook = XLSX.read(data, { type: "array" });
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
