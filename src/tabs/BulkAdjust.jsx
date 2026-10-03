// src/tabs/BulkAdjust.jsx
import React, { useMemo, useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate, todayISO } from "../lib/storage";
import { buyerOutstandingInvoices } from "../lib/calc";

// Every open row (invoice or debit note) of every buyer, exactly as Outstanding shows it.
function allOpenRows(data) {
  const out = [];
  data.buyers.forEach((b) => {
    buyerOutstandingInvoices(b.id, data.indents, data.mills, data.collections, data.debitNotes, data.creditNotes).forEach((r) =>
      out.push({ ...r, buyerId: b.id, buyerName: b.name })
    );
  });
  return out;
}

const rowId = (r) => `${r.buyerId}|${r.key}`;

function makeNote(r, reason, date) {
  return {
    buyerId: r.buyerId,
    date,
    amount: Math.round(r.balance),
    reason,
    invoiceNo: r.isDebitNote ? null : r.invoiceNo || null,
    indentNumber: r.indentNumber || null,
    targetKey: r.key, // applied to exactly this row
    autoAdjust: true,
  };
}

function PreviewTable({ rows, selected, toggle, showPct }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}></th>
            <th style={styles.th}>Party</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Invoice</th>
            <th style={styles.th}>Value</th>
            <th style={styles.th}>Balance</th>
            {showPct && <th style={styles.th}>%</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowId(r)}>
              <td style={styles.td}>
                <input type="checkbox" checked={selected.has(rowId(r))} onChange={() => toggle(rowId(r))} />
              </td>
              <td style={styles.td}>{r.buyerName}</td>
              <td style={styles.td}>{formatDate(r.invoiceDate)}</td>
              <td style={styles.td}>{r.invoiceNo}</td>
              <td style={styles.td}>{formatINR(r.value)}</td>
              <td style={styles.td}>{formatINR(r.balance)}</td>
              {showPct && <td style={styles.td}>{r.value ? ((r.balance / r.value) * 100).toFixed(1) : "—"}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useSelection(rows) {
  const [off, setOff] = useState(new Set()); // unchecked ids; default = everything checked
  const selected = useMemo(() => new Set(rows.map(rowId).filter((id) => !off.has(id))), [rows, off]);
  const toggle = (id) =>
    setOff((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  return { selected, toggle };
}

export default function BulkAdjustTab({ data, addCreditNotesBulk }) {
  const [date, setDate] = useState(todayISO());
  const [threshold, setThreshold] = useState(50);
  const maxTierPct = Math.max(0, ...((data.settings?.cdPolicy?.tiers || []).map((t) => Number(t.pct) || 0)));
  const [cdPct, setCdPct] = useState(maxTierPct || 4);
  const [buyerFilter, setBuyerFilter] = useState("");
  const [done, setDone] = useState("");

  const open = useMemo(() => allOpenRows(data), [data]);

  // 1) Small balances (round-offs, paise-level leftovers)
  const smallRows = useMemo(
    () => open.filter((r) => r.balance <= Number(threshold || 0)),
    [open, threshold]
  );
  const small = useSelection(smallRows);

  // 2) CD leftovers: invoice already paid in cash, only a CD-sized slice is pending
  const cdRows = useMemo(
    () =>
      open.filter(
        (r) =>
          !r.isDebitNote &&
          r.balance > Number(threshold || 0) &&
          r.value > 0 &&
          (r.paidCash || 0) > 0 &&
          r.balance <= (Number(cdPct) / 100) * r.value &&
          (!buyerFilter || r.buyerId === buyerFilter)
      ),
    [open, cdPct, threshold, buyerFilter]
  );
  const cd = useSelection(cdRows);

  const sum = (rows, sel) => rows.filter((r) => sel.has(rowId(r))).reduce((s, r) => s + Math.round(r.balance), 0);

  function apply(rows, sel, reason, label) {
    const chosen = rows.filter((r) => sel.has(rowId(r)));
    if (chosen.length === 0) return;
    const total = chosen.reduce((s, r) => s + Math.round(r.balance), 0);
    const parties = new Set(chosen.map((r) => r.buyerId)).size;
    if (!window.confirm(`${label}: ${chosen.length} Credit Notes, ${parties} parties, total ${formatINR(total)}. Continue?`)) return;
    addCreditNotesBulk(chosen.map((r) => makeNote(r, reason, date)));
    setDone(`${label}: ${chosen.length} Credit Notes created (${formatINR(total)}). Undo ke liye Credit Note tab se delete karein.`);
  }

  return (
    <div>
      <div style={styles.card}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Bulk Adjust</div>
        <div style={{ fontSize: 12, color: colors.textMuted, margin: "4px 0 8px" }}>
          Ek click mein kai customers ke chhote balance / bacha hua CD Credit Note se band karein. Har note usi invoice par lagta hai aur Ledger mein dikhta hai.
        </div>
        <label style={styles.label}>Credit Note date</label>
        <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {done && <div style={{ color: "#15803d", fontSize: 13, marginTop: 8 }}>✓ {done}</div>}
      </div>

      {/* ---------- 1. Small balance write-off ---------- */}
      <div style={styles.card}>
        <div style={{ fontWeight: 700 }}>1. Small balance write-off</div>
        <label style={styles.label}>Is amount tak ke balance (₹)</label>
        <input style={styles.input} type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        <div style={{ fontSize: 12, color: colors.textMuted, margin: "6px 0" }}>
          {smallRows.length} rows · {formatINR(sum(smallRows, small.selected))} (round-off Debit Notes, paise-level leftovers)
        </div>
        {smallRows.length > 0 && <PreviewTable rows={smallRows} selected={small.selected} toggle={small.toggle} />}
        <button
          style={{ ...styles.btn, marginTop: 10 }}
          disabled={small.selected.size === 0}
          onClick={() => apply(smallRows, small.selected, "Small balance write-off", "Write-off")}
        >
          Write off selected ({small.selected.size})
        </button>
      </div>

      {/* ---------- 2. Bulk CD credit notes ---------- */}
      <div style={styles.card}>
        <div style={{ fontWeight: 700 }}>2. Bulk Credit Note — bacha hua CD</div>
        <div style={{ fontSize: 12, color: colors.textMuted, margin: "4px 0" }}>
          Jin invoice mein cash mil chuka hai aur sirf CD jitna balance bacha hai.
        </div>
        <div style={styles.row2}>
          <div>
            <label style={styles.label}>Max balance (% of invoice)</label>
            <input style={styles.input} type="number" step="0.1" value={cdPct} onChange={(e) => setCdPct(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Customer</label>
            <select style={styles.input} value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)}>
              <option value="">All customers</option>
              {data.buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, margin: "6px 0" }}>
          {cdRows.length} invoices · {formatINR(sum(cdRows, cd.selected))}. Pehle preview check karein — jo asli baaki hai uska tick hata dein.
        </div>
        {cdRows.length > 0 && <PreviewTable rows={cdRows} selected={cd.selected} toggle={cd.toggle} showPct />}
        <button
          style={{ ...styles.btn, marginTop: 10 }}
          disabled={cd.selected.size === 0}
          onClick={() => apply(cdRows, cd.selected, "CD settlement", "CD Credit Notes")}
        >
          Create Credit Notes ({cd.selected.size})
        </button>
      </div>
    </div>
  );
}
