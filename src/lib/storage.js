// src/lib/storage.js
// All data lives in the browser's localStorage — same pattern as Amihem Sales.
// No backend needed; works fully offline because localStorage is always local.

const STORAGE_KEY = "indentingAgencyData_v2";

export const emptyData = {
  mills: [],
  buyers: [],
  indents: [],       // each indent has a nested `dispatches: []` array
  collections: [],   // buyer payments received (Collection module)
  debitNotes: [],    // buyer debit notes
  creditNotes: [],   // buyer credit notes
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    return { ...emptyData, ...JSON.parse(raw) };
  } catch {
    return emptyData;
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatINR(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
