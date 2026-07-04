// src/tabs/Outstanding.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { buyerOutstandingSummary, AGEING_BUCKETS } from "../lib/calc";
import { shareOutstanding } from "../lib/whatsapp";
import { printReport } from "../lib/print";

export default function OutstandingTab({ data }) {
  const [expandedId, setExpandedId] = useState(null);

  const summaries = data.buyers.map((buyer) =>
    buyerOutstandingSummary(buyer, data.indents, data.collections, data.debitNotes, data.creditNotes)
  );

  const grandTotal = summaries.reduce((s, x) => s + x.netOutstanding, 0);
  const grandAgeing = { "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0 };
  summaries.forEach((s) => {
    AGEING_BUCKETS.forEach((b) => (grandAgeing[b] += s.ageingTotals[b]));
  });

  function exportPDF() {
    const rows = summaries
      .filter((s) => Math.abs(s.netOutstanding) > 0.5)
      .map(
        (s) => `
        <tr>
          <td>${s.buyer.name}</td>
          <td>${formatINR(s.totalSales)}</td>
          <td>${formatINR(s.totalCollections)}</td>
          <td>${formatINR(s.netOutstanding)}</td>
          ${AGEING_BUCKETS.map((b) => `<td>${formatINR(s.ageingTotals[b])}</td>`).join("")}
        </tr>`
      )
      .join("");

    const html = `
      <h2>Customer Outstanding — Ageing Report</h2>
      <p>As on ${new Date().toLocaleDateString("en-IN")}</p>
      <table>
        <thead>
          <tr>
            <th>Buyer</th><th>Total Sales</th><th>Collections</th><th>Net Outstanding</th>
            ${AGEING_BUCKETS.map((b) => `<th>${b} days</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>Grand Total Outstanding: ${formatINR(grandTotal)}</strong></p>
    `;
    printReport("Customer Outstanding Report", html);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Customer Outstanding (with Ageing)</div>
        <button style={styles.btnPdf} onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      <div style={{ ...styles.card, background: colors.indigo, color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Total Net Outstanding (All Buyers)</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{formatINR(grandTotal)}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
          {AGEING_BUCKETS.map((b) => (
            <div key={b}>
              <div style={{ opacity: 0.8 }}>{b} days</div>
              <div style={{ fontWeight: 700 }}>{formatINR(grandAgeing[b])}</div>
            </div>
          ))}
        </div>
      </div>

      {summaries
        .filter((s) => Math.abs(s.netOutstanding) > 0.5 || s.totalSales > 0)
        .map((s) => (
          <div key={s.buyer.id} style={styles.listItem}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setExpandedId(expandedId === s.buyer.id ? null : s.buyer.id)}
            >
              <div>
                <strong>{s.buyer.name}</strong>
                <div style={{ fontSize: 12, color: colors.textMuted }}>
                  Sales: {formatINR(s.totalSales)} · Collected: {formatINR(s.totalCollections)}
                </div>
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: s.netOutstanding > 0 ? colors.danger : colors.success,
                }}
              >
                {formatINR(s.netOutstanding)}
              </div>
            </div>

            {expandedId === s.buyer.id && (
              <div style={{ marginTop: 10, borderTop: `1px dashed ${colors.border}`, paddingTop: 10 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, marginBottom: 10 }}>
                  {AGEING_BUCKETS.map((b) => (
                    <div key={b}>
                      <div style={{ color: colors.textMuted }}>{b} days</div>
                      <div style={{ fontWeight: 700 }}>{formatINR(s.ageingTotals[b])}</div>
                    </div>
                  ))}
                  {Math.abs(s.adjustments) > 0.5 && (
                    <div>
                      <div style={{ color: colors.textMuted }}>Adjustments (DN/CN)</div>
                      <div style={{ fontWeight: 700 }}>{formatINR(s.adjustments)}</div>
                    </div>
                  )}
                </div>
                <button style={styles.btnWhatsapp} onClick={() => shareOutstanding(s)}>
                  Share Statement (WA)
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
