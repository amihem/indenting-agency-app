// src/tabs/Outstanding.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate } from "../lib/storage";
import { buyerOutstandingInvoices, millOutstandingSummary, millOutstandingInvoices } from "../lib/calc";
import { shareOutstanding } from "../lib/whatsapp";
import { printReport } from "../lib/print";

export default function OutstandingTab({ data }) {
  const [view, setView] = useState("customer"); // "customer" | "mill"
  const [buyerFilter, setBuyerFilter] = useState("");
  const [millFilter, setMillFilter] = useState("");

  const buyersToShow = buyerFilter ? data.buyers.filter((b) => b.id === buyerFilter) : data.buyers;

  const perBuyer = buyersToShow
    .map((buyer) => ({
      buyer,
      invoices: buyerOutstandingInvoices(buyer.id, data.indents, data.mills, data.collections),
    }))
    .filter((x) => x.invoices.length > 0);

  const grandTotal = perBuyer.reduce((s, x) => s + x.invoices.reduce((s2, i) => s2 + i.balance, 0), 0);

  const millPending = millOutstandingSummary(data.indents, data.mills, data.collections);
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  function exportCustomerPDF() {
    let html = `<h2>Customer Outstanding Report</h2><p>As on ${new Date().toLocaleDateString("en-IN")}</p>`;
    perBuyer.forEach(({ buyer, invoices }) => {
      const total = invoices.reduce((s, i) => s + i.balance, 0);
      html += `
        <h3>Party Name: ${buyer.name}</h3>
        <table>
          <thead><tr><th>Inv Date</th><th>Inv No.</th><th>Amount</th><th>Credit</th><th>Balance</th><th>Days</th></tr></thead>
          <tbody>
            ${invoices
              .map(
                (i) => `<tr><td>${formatDate(i.invoiceDate)}</td><td>${i.invoiceNo || i.indentNumber}</td><td>${formatINR(
                  i.value
                )}</td><td>${formatINR(i.paidTotal)}</td><td>${formatINR(i.balance)}</td><td>${i.days}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
        <p><strong>Party Total: ${formatINR(total)}</strong></p>
      `;
    });
    html += `<h3>Grand Total Outstanding: ${formatINR(grandTotal)}</h3>`;
    printReport("Customer Outstanding Report", html);
  }

  function exportMillPDF() {
    const rows = Object.entries(millPending)
      .map(([millId, amt]) => `<tr><td>${millName(millId)}</td><td>${formatINR(amt)}</td></tr>`)
      .join("");
    const total = Object.values(millPending).reduce((s, v) => s + v, 0);
    const html = `
      <h2>Mill-wise Pending Amount Report</h2>
      <p>As on ${new Date().toLocaleDateString("en-IN")}</p>
      <table><thead><tr><th>Mill</th><th>Pending Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <p><strong>Total Pending: ${formatINR(total)}</strong></p>
    `;
    printReport("Mill-wise Pending Report", html);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Outstanding</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={view === "customer" ? styles.btn : styles.btnGhost}
            onClick={() => setView("customer")}
          >
            Customer-wise
          </button>
          <button style={view === "mill" ? styles.btn : styles.btnGhost} onClick={() => setView("mill")}>
            Mill-wise Pending
          </button>
        </div>
      </div>

      {view === "customer" && (
        <>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Filter by Buyer</label>
              <select style={styles.input} value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)}>
                <option value="">All buyers</option>
                {data.buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <button style={styles.btnPdf} onClick={exportCustomerPDF}>
                Export PDF
              </button>
            </div>
          </div>

          <div style={{ ...styles.card, background: colors.indigo, color: "#fff" }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Total Outstanding (All Buyers)</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{formatINR(grandTotal)}</div>
          </div>

          {perBuyer.length === 0 && (
            <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
              No outstanding invoices.
            </div>
          )}

          {perBuyer.map(({ buyer, invoices }) => {
            const partyTotal = invoices.reduce((s, i) => s + i.balance, 0);
            return (
              <div key={buyer.id} style={styles.card}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Party Name: {buyer.name}</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Inv Date</th>
                        <th style={styles.th}>Inv No.</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Credit</th>
                        <th style={styles.th}>Balance</th>
                        <th style={styles.th}>Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.key}>
                          <td style={styles.td}>{formatDate(inv.invoiceDate)}</td>
                          <td style={styles.td}>{inv.invoiceNo || inv.indentNumber}</td>
                          <td style={styles.td}>{formatINR(inv.value)}</td>
                          <td style={styles.td}>{formatINR(inv.paidTotal)}</td>
                          <td style={{ ...styles.td, fontWeight: 700 }}>{formatINR(inv.balance)}</td>
                          <td style={styles.td}>{inv.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <strong>Party Total: {formatINR(partyTotal)}</strong>
                  <button style={styles.btnWhatsapp} onClick={() => shareOutstanding(buyer, invoices, partyTotal)}>
                    Share (WA)
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {view === "mill" && (
        <>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Filter by Mill</label>
              <select style={styles.input} value={millFilter} onChange={(e) => setMillFilter(e.target.value)}>
                <option value="">All mills</option>
                {data.mills.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <button style={styles.btnPdf} onClick={exportMillPDF}>
                Export PDF
              </button>
            </div>
          </div>

          <div style={{ ...styles.card, background: colors.indigo, color: "#fff" }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Total Pending (All Mills)</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {formatINR(Object.values(millPending).reduce((s, v) => s + v, 0))}
            </div>
          </div>

          {(millFilter ? data.mills.filter((m) => m.id === millFilter) : data.mills)
            .map((mill) => ({ mill, invoices: millOutstandingInvoices(mill.id, data.indents, data.mills, data.collections) }))
            .filter((x) => x.invoices.length > 0)
            .map(({ mill, invoices }) => {
              const millTotal = invoices.reduce((s, i) => s + i.balance, 0);
              return (
                <div key={mill.id} style={styles.card}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Mill: {mill.name}</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Inv Date</th>
                          <th style={styles.th}>Inv No.</th>
                          <th style={styles.th}>Party (Buyer)</th>
                          <th style={styles.th}>Amount</th>
                          <th style={styles.th}>Credit</th>
                          <th style={styles.th}>Balance</th>
                          <th style={styles.th}>Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.key}>
                            <td style={styles.td}>{formatDate(inv.invoiceDate)}</td>
                            <td style={styles.td}>{inv.invoiceNo || inv.indentNumber}</td>
                            <td style={styles.td}>{buyerNameById(data, inv.buyerId)}</td>
                            <td style={styles.td}>{formatINR(inv.value)}</td>
                            <td style={styles.td}>{formatINR(inv.paidTotal)}</td>
                            <td style={{ ...styles.td, fontWeight: 700 }}>{formatINR(inv.balance)}</td>
                            <td style={styles.td}>{inv.days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ textAlign: "right", marginTop: 10, fontWeight: 800 }}>
                    Mill Total: {formatINR(millTotal)}
                  </div>
                </div>
              );
            })}

          {Object.keys(millPending).length === 0 && (
            <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
              No pending amounts.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function buyerNameById(data, id) {
  return data.buyers.find((b) => b.id === id)?.name || "—";
}
