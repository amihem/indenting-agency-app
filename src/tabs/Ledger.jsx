// src/tabs/Ledger.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate } from "../lib/storage";
import { indentValue, totalDispatchedQty } from "../lib/calc";
import { printReport } from "../lib/print";

export default function LedgerTab({ data }) {
  const [entityType, setEntityType] = useState("buyer");
  const [entityId, setEntityId] = useState("");

  const entities = entityType === "buyer" ? data.buyers : data.mills;

  function buildBuyerLedger(buyerId) {
    const entries = [];
    data.indents
      .filter((i) => i.buyerId === buyerId)
      .forEach((i) =>
        entries.push({
          date: i.date,
          particulars: `Indent ${i.indentNumber} — ${i.productName}`,
          debit: indentValue(i),
          credit: 0,
        })
      );
    data.collections
      .filter((c) => c.buyerId === buyerId)
      .forEach((c) =>
        entries.push({
          date: c.date,
          particulars: `Collection received (${c.mode}${c.reference ? " · " + c.reference : ""})`,
          debit: 0,
          credit: Number(c.amount) || 0,
        })
      );
    data.debitNotes
      .filter((n) => n.buyerId === buyerId)
      .forEach((n) =>
        entries.push({
          date: n.date,
          particulars: `Debit Note${n.reason ? " — " + n.reason : ""}`,
          debit: Number(n.amount) || 0,
          credit: 0,
        })
      );
    data.creditNotes
      .filter((n) => n.buyerId === buyerId)
      .forEach((n) =>
        entries.push({
          date: n.date,
          particulars: `Credit Note${n.reason ? " — " + n.reason : ""}`,
          debit: 0,
          credit: Number(n.amount) || 0,
        })
      );

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    return entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }

  function buildMillLedger(millId) {
    const entries = [];
    data.indents
      .filter((i) => i.millId === millId)
      .forEach((i) => {
        entries.push({
          date: i.date,
          particulars: `Indent ${i.indentNumber} placed — ${i.productName} (${i.quantity} ${i.unit})`,
        });
        (i.dispatches || []).forEach((d) =>
          entries.push({
            date: d.date,
            particulars: `Dispatched ${d.qty} ${i.unit} against ${i.indentNumber}${
              d.lrNumber ? " · LR " + d.lrNumber : ""
            }`,
          })
        );
      });
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    return entries;
  }

  const ledger =
    entityType === "buyer" && entityId
      ? buildBuyerLedger(entityId)
      : entityType === "mill" && entityId
      ? buildMillLedger(entityId)
      : [];

  const entityName = entities.find((e) => e.id === entityId)?.name || "";

  function exportPDF() {
    if (entityType === "buyer") {
      const rows = ledger
        .map(
          (e) => `
        <tr>
          <td>${formatDate(e.date)}</td>
          <td>${e.particulars}</td>
          <td>${e.debit ? formatINR(e.debit) : ""}</td>
          <td>${e.credit ? formatINR(e.credit) : ""}</td>
          <td>${formatINR(e.balance)}</td>
        </tr>`
        )
        .join("");
      const html = `
        <h2>Account Ledger — ${entityName}</h2>
        <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
        <table>
          <thead><tr><th>Date</th><th>Particulars</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
      printReport(`Ledger - ${entityName}`, html);
    } else {
      const rows = ledger.map((e) => `<tr><td>${formatDate(e.date)}</td><td>${e.particulars}</td></tr>`).join("");
      const html = `
        <h2>Mill Order & Dispatch History — ${entityName}</h2>
        <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
        <table>
          <thead><tr><th>Date</th><th>Particulars</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
      printReport(`Ledger - ${entityName}`, html);
    }
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Account Ledger</div>
        {entityId && (
          <button style={styles.btnPdf} onClick={exportPDF}>
            Export PDF
          </button>
        )}
      </div>

      <div style={styles.row2}>
        <div>
          <label style={styles.label}>Ledger Type</label>
          <select
            style={styles.input}
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setEntityId("");
            }}
          >
            <option value="buyer">Buyer</option>
            <option value="mill">Mill</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>{entityType === "buyer" ? "Buyer" : "Mill"}</label>
          <select style={styles.input} value={entityId} onChange={(e) => setEntityId(e.target.value)}>
            <option value="">Select {entityType}</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!entityId && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          Select a {entityType} to view their ledger.
        </div>
      )}

      {entityId && entityType === "buyer" && (
        <div style={{ ...styles.card, overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Particulars</th>
                <th style={styles.th}>Debit</th>
                <th style={styles.th}>Credit</th>
                <th style={styles.th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e, i) => (
                <tr key={i}>
                  <td style={styles.td}>{formatDate(e.date)}</td>
                  <td style={{ ...styles.td, whiteSpace: "normal" }}>{e.particulars}</td>
                  <td style={styles.td}>{e.debit ? formatINR(e.debit) : ""}</td>
                  <td style={styles.td}>{e.credit ? formatINR(e.credit) : ""}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{formatINR(e.balance)}</td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={5}>
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {entityId && entityType === "mill" && (
        <div style={{ ...styles.card, overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Particulars</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e, i) => (
                <tr key={i}>
                  <td style={styles.td}>{formatDate(e.date)}</td>
                  <td style={{ ...styles.td, whiteSpace: "normal" }}>{e.particulars}</td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={2}>
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
