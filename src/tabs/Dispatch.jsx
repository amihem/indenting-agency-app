// src/tabs/Dispatch.jsx
import React, { useState, useMemo } from "react";
import { styles, colors } from "../styles";
import { formatDate, formatINR, todayISO } from "../lib/storage";
import { computeInvoices } from "../lib/calc";
import { printReport } from "../lib/print";

export default function DispatchTab({ data, updateDispatch, deleteDispatch }) {
  const [buyerFilter, setBuyerFilter] = useState("");
  const [millFilter, setMillFilter] = useState("");
  const [editingKey, setEditingKey] = useState(null);

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  const allInvoices = useMemo(() => computeInvoices(data.indents, data.mills), [data.indents, data.mills]);

  const rows = allInvoices
    .filter((inv) => !buyerFilter || inv.buyerId === buyerFilter)
    .filter((inv) => !millFilter || inv.millId === millFilter)
    .sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));

  function exportPDF() {
    const tableRows = rows
      .map(
        (r) => `
      <tr>
        <td>${r.indentNumber}</td><td>${buyerName(r.buyerId)}</td><td>${millName(r.millId)}</td><td>${r.invoiceNo || "—"}</td>
        <td>${r.qty}</td><td>${formatINR(r.rate)}</td><td>${formatINR(r.unitValue)}</td>
        <td>${formatINR(r.freight)}</td><td>${formatINR(r.gstAmount)}</td><td>${r.roundOff.toFixed(2)}</td>
        <td><strong>${formatINR(r.value)}</strong></td>
      </tr>`
      )
      .join("");
    const html = `<h2>Dispatch Register</h2><table><thead><tr><th>Indent No</th><th>Buyer</th><th>Mill</th><th>Mill Inv</th><th>Qty</th><th>Rate</th><th>Base Val</th><th>Freight</th><th>GST (5%)</th><th>R/Off</th><th>Total Val</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    printReport("Dispatch Register", html);
  }

  function handleDelete(r) {
    const ok = window.confirm(`⚠️ Delete this dispatch (${r.qty} ${r.unit} — Indent ${r.indentNumber})? This cannot be undone.`);
    if (ok) deleteDispatch(r.indentId, r.dispatchId);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Dispatch Tracking</div>
        <button style={styles.btnPdf} onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      <div style={styles.row2}>
        <div>
          <label style={styles.label}>Customer (Buyer)</label>
          <select style={styles.input} value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)}>
            <option value="">All buyers</option>
            {data.buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={styles.label}>Mill</label>
          <select style={styles.input} value={millFilter} onChange={(e) => setMillFilter(e.target.value)}>
            <option value="">All mills</option>
            {data.mills.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
        Showing {rows.length} of {allInvoices.length} dispatch entries.
        {millFilter && ` Filtered to: ${millName(millFilter)}.`}
      </div>

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Indent</th>
              <th style={styles.th}>Buyer</th>
              <th style={styles.th}>Mill</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Rate</th>
              <th style={styles.th}>Base Val</th>
              <th style={styles.th}>Freight</th>
              <th style={styles.th}>GST(5%)</th>
              <th style={styles.th}>R/Off</th>
              <th style={styles.th}>Inv Val</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              editingKey === r.key ? (
                <EditRow
                  key={r.key}
                  row={r}
                  colSpan={12}
                  onCancel={() => setEditingKey(null)}
                  onSave={(changes) => {
                    updateDispatch(r.indentId, r.dispatchId, changes);
                    setEditingKey(null);
                  }}
                />
              ) : (
                <tr key={r.key}>
                  <td style={styles.td}>{formatDate(r.invoiceDate)}</td>
                  <td style={styles.td}>{r.indentNumber}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{buyerName(r.buyerId)}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{millName(r.millId)}</td>
                  <td style={styles.td}>
                    {r.qty} {r.unit}
                  </td>
                  <td style={styles.td}>{r.rate}</td>
                  <td style={styles.td}>{formatINR(r.unitValue)}</td>
                  <td style={styles.td}>{formatINR(r.freight)}</td>
                  <td style={styles.td}>{formatINR(r.gstAmount)}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: colors.textMuted }}>{r.roundOff.toFixed(2)}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{formatINR(r.value)}</td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...styles.btnGhost, padding: "4px 8px", fontSize: 11 }} onClick={() => setEditingKey(r.key)}>
                        Edit
                      </button>
                      <button style={{ ...styles.btnDanger, padding: "4px 8px", fontSize: 11 }} onClick={() => handleDelete(r)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {rows.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={12}>
                  No dispatch entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Inline edit row ---------- */
function EditRow({ row, onSave, onCancel, colSpan }) {
  const [form, setForm] = useState({
    qty: row.qty,
    date: row.dispatchDate || todayISO(),
    invoiceNumber: row.invoiceNo || "",
    invoiceDate: row.invoiceDate || todayISO(),
    lrNumber: row.lrNo || "",
    lrDate: row.lrDate || todayISO(),
    transporter: row.transporter || "",
    freight: row.freight || 0,
  });

  function save() {
    onSave({ ...form, qty: Number(form.qty), freight: Number(form.freight) || 0 });
  }

  return (
    <tr>
      <td style={styles.td} colSpan={colSpan}>
        <div style={{ ...styles.card, margin: 0, background: colors.bg }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: colors.mustard }}>
            Editing Dispatch — Indent {row.indentNumber}
          </div>
          <div style={styles.row3}>
            <div>
              <label style={styles.label}>Qty ({row.unit})</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Dispatch Date</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Freight (₹)</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="number" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} />
            </div>
          </div>
          <div style={styles.row3}>
            <div>
              <label style={styles.label}>Mill Invoice No</label>
              <input style={{ ...styles.input, marginBottom: 8 }} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Invoice Date</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Transporter</label>
              <input style={{ ...styles.input, marginBottom: 8 }} value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} />
            </div>
          </div>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>LR No</label>
              <input style={{ ...styles.input, marginBottom: 8 }} value={form.lrNumber} onChange={(e) => setForm({ ...form, lrNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>LR Date</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="date" value={form.lrDate} onChange={(e) => setForm({ ...form, lrDate: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={styles.btn} onClick={save}>
              Save Changes
            </button>
            <button style={styles.btnGhost} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
