// src/lib/storage.js
// All data lives in the browser's localStorage — same pattern as Amihem Sales.
// No backend needed; works fully offline because localStorage is always local.

const STORAGE_KEY = "indentingAgencyData_v2";

export const DEFAULT_CD_POLICY = {
  maxCreditDays: 120,
  tiers: [
    { label: "Early Payment", minDays: 7, maxDays: 12, pct: 4 },
    { label: "Mid Term", minDays: 35, maxDays: 45, pct: 3 },
    { label: "Standard", minDays: 46, maxDays: 60, pct: 2 },
  ],
};

export const emptyData = {
  mills: [],
  buyers: [],
  products: [],     // Products master (fabric spec — no price stored here)
  indents: [],       // each indent has a nested `dispatches: []` array (dispatches = mill invoices)
  collections: [],   // buyer payments received, each with per-invoice allocations
  debitNotes: [],    // buyer debit notes
  creditNotes: [],   // buyer credit notes
  settings: {
    cdPolicy: DEFAULT_CD_POLICY,
  },
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw);
    return { ...emptyData, ...parsed, settings: { ...emptyData.settings, ...(parsed.settings || {}) } };
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

// For ledgers: shows "Dr" (customer owes us) or "Cr" (we owe customer / overpaid)
// instead of a confusing negative sign.
export function formatBalance(n) {
  const num = Number(n) || 0;
  const abs = Math.abs(num);
  const suffix = num >= 0 ? "Dr" : "Cr";
  return `${formatINR(abs)} ${suffix}`;
}

export const ROLL_LENGTH_METERS = 130;

// Every Collection (payment) gets a sequential, permanent ID like PMT-0001 —
// shown on screen, in WhatsApp shares, and on PDF exports so a specific
// payment can always be pointed to unambiguously.
export function nextPaymentId(collections) {
  let maxNum = 0;
  (collections || []).forEach((c) => {
    const m = c.paymentId && /PMT-(\d+)/.exec(c.paymentId);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  return `PMT-${String(maxNum + 1).padStart(4, "0")}`;
}

// One-time migration: backfills a Payment ID onto any collection that
// doesn't have one yet (older payments recorded before this feature existed),
// numbering them in date order so the oldest payment becomes PMT-0001.
// Returns the same array unchanged if nothing needed backfilling.
export function backfillPaymentIds(collections) {
  const missing = (collections || [])
    .map((c, idx) => ({ c, idx }))
    .filter((x) => !x.c.paymentId)
    .sort((a, b) => new Date(a.c.date) - new Date(b.c.date));

  if (missing.length === 0) return collections;

  let maxNum = 0;
  collections.forEach((c) => {
    const m = c.paymentId && /PMT-(\d+)/.exec(c.paymentId);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });

  const result = [...collections];
  missing.forEach(({ idx }) => {
    maxNum += 1;
    result[idx] = { ...result[idx], paymentId: `PMT-${String(maxNum).padStart(4, "0")}` };
  });
  return result;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
