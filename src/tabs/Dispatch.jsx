// src/tabs/Dispatch.jsx
import React, { useState, useMemo } from "react";
import { styles, colors } from "../styles";
import { formatDate, formatINR } from "../lib/storage";
import { computeInvoices, pendingQty } from "../lib/calc";
import { shareDispatch } from "../lib/whatsapp";
import { printReport } from "../lib/print";

export default function DispatchTab({ data }) {
  const [buyerFilter, setBuyerFilter] = useState("");
  const [millFilter, setMillFilter] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);
  const getIndent = (id) => data.indents.find((i) => i.id === id);

  const allInvoices = useMemo(() => computeInvoices(data.indents, data.mills), [data.indents, data.mills]);

  const rows = allInvoices
    .filter((inv) => !buyerFilter || inv.buyerId === buyerFilter)
    .filter((inv) => !millFilter || inv.millId === millFilter)
    .sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));

  function exportPDF() {
    const tableRows = rows.map((r) => `
      <tr>
        <td>${r.indentNumber}</td><td>${buyerName(r.buyerId)}</td><td>${r.invoiceNo || "—"}</td>
        <td>${r.qty}</td><td>${formatINR(r.rate)}</td><td>${formatINR(r.baseValue)}</td>
        <td>${formatINR(r.freight)}</td><td>${formatINR(r.gst)}</td><td>${r.roundOff.toFixed(2)}</td>
        <td><strong>${formatINR(r.value)}</strong></td>
      </tr>`).join("");
    const html = `<h2>Dispatch Register</h2><table><thead><tr><th>Indent No</th><th>Buyer</th><th>Mill Inv</th><th>Qty</th><th>Rate</th><th>Base Val</th><th>Freight</th><th>GST (5%)</th><th>R/Off</th><th>Total Val</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    printReport("Dispatch Register", html);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Dispatch Tracking</div>
        <button style={styles.btnPdf} onClick={exportPDF}>Export PDF</button>
      </div>

      <div style={styles.row2}>
        <div>
          <label style={styles.label}>Customer (Buyer)</label>
          <select style={styles.input} value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)}>
            <option value="">All buyers</option>
            {data.buyers.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </div>
        <div>
          <label style={styles.label}>Mill</label>
          <select style={styles.input} value={millFilter} onChange={(e) => setMillFilter(e.target.value)}>
            <option value="">All mills</option>
            {data.mills.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
      </div>

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Indent</th>
              <th style={styles.th}>Buyer</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Rate</th>
              <th style={styles.th}>Base Val</th>
              <th style={styles.th}>Freight</th>
              <th style={styles.th}>GST(5%)</th>
              <th style={styles.th}>R/Off</th>
              <th style={styles.th}>Inv Val</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={styles.td}>{formatDate(r.invoiceDate)}</td>
                <td style={styles.td}>{r.indentNumber}</td>
                <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{buyerName(r.buyerId)}</td>
                <td style={styles.td}>{r.qty} {r.unit}</td>
                <td style={styles.td}>{r.rate}</td>
                <td style={styles.td}>{formatINR(r.baseValue)}</td>
                <td style={styles.td}>{formatINR(r.freight)}</td>
                <td style={styles.td}>{formatINR(r.gst)}</td>
                <td style={{...styles.td, fontSize: 11, color: colors.textMuted}}>{r.roundOff.toFixed(2)}</td>
                <td style={{ ...styles.td, fontWeight: 700 }}>{formatINR(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}