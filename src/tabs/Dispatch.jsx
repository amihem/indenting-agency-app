// src/tabs/Dispatch.jsx
// One row per dispatch = one Mill Invoice. Shows every field requested:
// Indent Date, Indent No, Buyer, Mill, Mill Inv, Inv Date, Product, Qty,
// Rate, Inv Value, Transport, LR No & LR Date — with customer/mill/product filters.
import React, { useState, useMemo } from "react";
import { styles, colors } from "../styles";
import { formatDate, formatINR } from "../lib/storage";
import { computeInvoices, pendingQty } from "../lib/calc";
import { shareDispatch } from "../lib/whatsapp";
import { printReport } from "../lib/print";

export default function DispatchTab({ data }) {
  const [buyerFilter, setBuyerFilter] = useState("");
  const [millFilter, setMillFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);
  const getIndent = (id) => data.indents.find((i) => i.id === id);

  const allInvoices = useMemo(() => computeInvoices(data.indents, data.mills), [data.indents, data.mills]);

  const productNames = [...new Set(data.indents.map((i) => i.productName).filter(Boolean))];

  const rows = allInvoices
    .filter((inv) => !buyerFilter || inv.buyerId === buyerFilter)
    .filter((inv) => !millFilter || inv.millId === millFilter)
    .filter((inv) => !productFilter || inv.productName === productFilter)
    .sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));

  const pendingIndents = data.indents.filter((i) => i.status !== "cancelled" && i.status !== "closed" && pendingQty(i) > 0);

  function exportPDF() {
    const tableRows = rows
      .map(
        (r) => `
      <tr>
        <td>${formatDate(r.indentDate)}</td>
        <td>${r.indentNumber}</td>
        <td>${buyerName(r.buyerId)}</td>
        <td>${millName(r.millId)}</td>
        <td>${r.invoiceNo || "—"}</td>
        <td>${formatDate(r.invoiceDate)}</td>
        <td>${r.productName}</td>
        <td>${r.qty} ${r.unit}</td>
        <td>${formatINR(r.rate)}</td>
        <td>${formatINR(r.value)}</td>
        <td>${r.transporter || "—"}</td>
        <td>${r.lrNo || "—"}</td>
        <td>${r.lrDate ? formatDate(r.lrDate) : "—"}</td>
      </tr>`
      )
      .join("");
    const html = `
      <h2>Dispatch Register</h2>
      <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
      <table>
        <thead>
          <tr>
            <th>Indent Date</th><th>Indent No</th><th>Buyer</th><th>Mill</th><th>Mill Inv</th>
            <th>Inv Date</th><th>Product</th><th>Qty</th><th>Rate</th><th>Inv Value</th>
            <th>Transport</th><th>LR No</th><th>LR Date</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
    printReport("Dispatch Register", html);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Dispatch Tracking</div>
        <button style={styles.btnPdf} onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      <div style={styles.row3}>
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
        <div>
          <label style={styles.label}>Product</label>
          <select style={styles.input} value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="">All products</option>
            {productNames.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {pendingIndents.length > 0 && (
        <div style={{ ...styles.card, borderColor: colors.mustard }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: colors.mustard }}>
            Awaiting Dispatch ({pendingIndents.length})
          </div>
          {pendingIndents.map((i) => (
            <div key={i.id} style={{ fontSize: 13, padding: "6px 0" }}>
              <strong>{i.indentNumber}</strong> — {buyerName(i.buyerId)} ← {millName(i.millId)} · {i.productName} ·{" "}
              {pendingQty(i)} {i.unit} pending · Value: {formatINR(pendingQty(i) * (Number(i.rate) || 0))}
            </div>
          ))}
        </div>
      )}

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Indent Date</th>
              <th style={styles.th}>Indent No</th>
              <th style={styles.th}>Buyer</th>
              <th style={styles.th}>Mill</th>
              <th style={styles.th}>Mill Inv</th>
              <th style={styles.th}>Inv Date</th>
              <th style={styles.th}>Product</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Rate</th>
              <th style={styles.th}>Inv Value</th>
              <th style={styles.th}>Transport</th>
              <th style={styles.th}>LR No</th>
              <th style={styles.th}>LR Date</th>
              <th style={styles.th}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const indent = getIndent(r.indentId);
              return (
                <tr key={r.key}>
                  <td style={styles.td}>{formatDate(r.indentDate)}</td>
                  <td style={styles.td}>{r.indentNumber}</td>
                  <td style={styles.td}>{buyerName(r.buyerId)}</td>
                  <td style={styles.td}>{millName(r.millId)}</td>
                  <td style={styles.td}>{r.invoiceNo || "—"}</td>
                  <td style={styles.td}>{formatDate(r.invoiceDate)}</td>
                  <td style={{ ...styles.td, whiteSpace: "normal" }}>{r.productName}</td>
                  <td style={styles.td}>
                    {r.qty} {r.unit}
                  </td>
                  <td style={styles.td}>{formatINR(r.rate)}</td>
                  <td style={styles.td}>{formatINR(r.value)}</td>
                  <td style={styles.td}>{r.transporter || "—"}</td>
                  <td style={styles.td}>{r.lrNo || "—"}</td>
                  <td style={styles.td}>{r.lrDate ? formatDate(r.lrDate) : "—"}</td>
                  <td style={styles.td}>
                    {indent && (
                      <button
                        style={{ ...styles.btnWhatsapp, padding: "4px 8px" }}
                        onClick={() =>
                          shareDispatch(
                            indent,
                            { ...r, date: r.dispatchDate, invoiceNumber: r.invoiceNo, lrNumber: r.lrNo },
                            getBuyer(r.buyerId)
                          )
                        }
                      >
                        WA
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={14}>
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
