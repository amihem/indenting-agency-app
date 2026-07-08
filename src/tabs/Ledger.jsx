// src/tabs/Ledger.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate } from "../lib/storage";
import { ledgerEntries } from "../lib/calc";
import { printReport } from "../lib/print";

export default function LedgerTab({ data }) {
  const [entityType, setEntityType] = useState("buyer");
  const [entityId, setEntityId] = useState("");

  const entities = entityType === "buyer" ? data.buyers : data.mills;
  const entityName = entities.find((e) => e.id === entityId)?.name || "";

  const entries = entityId
    ? ledgerEntries({
        entityType,
        entityId,
        indents: data.indents,
        mills: data.mills,
        collections: data.collections,
        debitNotes: data.debitNotes,
        creditNotes: data.creditNotes,
      })
    : [];

  const totalBalance = entries.length ? entries[entries.length - 1].runningBalance : 0;

  const formatDrCr = (amount) => {
    if (amount === 0) return "0";
    return amount > 0 ? `${formatINR(amount)} Dr` : `${formatINR(Math.abs(amount))} Cr`;
  };

  function exportPDF() {
    const rows = entries
      .map(
        (e) => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.particular}</td>
        <td>${e.debit ? formatINR(e.debit) : ""}</td>
        <td>${e.credit ? formatINR(e.credit) : ""}</td>
        <td>${formatDrCr(e.runningBalance)}</td>
      </tr>`
      )
      .join("");
    const html = `
      <h2>Account Ledger — ${entityName}</h2>
      <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
      <table>
        <thead>
          <tr><th>Date</th><th>Particular</th><th>Debit Amt</th><th>Credit Amt</th><th>Balance</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>Total Balance: ${formatDrCr(totalBalance)}</strong></p>
    `;
    printReport(`Ledger - ${entityName}`, html);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Account Ledger</div>
        {entityId && (
          <button style={styles.btnPdf} onClick={exportPDF}>Export PDF</button>
        )}
      </div>

      <div style={styles.row2}>
        <div>
          <label style={styles.label}>Ledger Type</label>
          <select style={styles.input} value={entityType} onChange={(e) => { setEntityType(e.target.value); setEntityId(""); }}>
            <option value="buyer">Buyer</option>
            <option value="mill">Mill</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>{entityType === "buyer" ? "Buyer" : "Mill"}</label>
          <select style={styles.input} value={entityId} onChange={(e) => setEntityId(e.target.value)}>
            <option value="">Select {entityType}</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {entityId && (
        <div style={{ ...styles.card, overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Particular</th>
                <th style={styles.th}>Debit Amt</th>
                <th style={styles.th}>Credit Amt</th>
                <th style={styles.th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i}>
                  <td style={styles.td}>{formatDate(e.date)}</td>
                  <td style={{ ...styles.td, whiteSpace: "normal" }}>{e.particular}</td>
                  <td style={styles.td}>{e.debit ? formatINR(e.debit) : ""}</td>
                  <td style={styles.td}>{e.credit ? formatINR(e.credit) : ""}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{formatDrCr(e.runningBalance)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td style={styles.td} colSpan={5}>No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}