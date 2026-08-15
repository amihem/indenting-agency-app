// src/tabs/Ledger.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate, formatBalance } from "../lib/storage";
import { ledgerEntries } from "../lib/calc";
import { printReport } from "../lib/print";
import { collectFYs, getFYDateRange, FYSelect } from "../lib/fy.jsx";
import SearchableSelect from "../components/SearchableSelect";

export default function LedgerTab({ data }) {
  const [entityType, setEntityType] = useState("buyer");
  const [entityId, setEntityId] = useState("");
  const [fyFilter, setFyFilter] = useState("");

  const entities = entityType === "buyer" ? data.buyers : data.mills;
  const entityName = entities.find((e) => e.id === entityId)?.name || "";

  const allEntries = entityId
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

  const availableFYs = collectFYs([[allEntries, (e) => e.date]]);

  // Filtering to one FY still needs a correct running balance, so we carry
  // forward whatever the balance was just before that FY started.
  let entries = allEntries;
  let openingBalance = 0;
  if (fyFilter) {
    const range = getFYDateRange(fyFilter);
    const before = allEntries.filter((e) => e.date < range.from);
    openingBalance = before.length ? before[before.length - 1].runningBalance : 0;
    entries = allEntries.filter((e) => e.date >= range.from && e.date <= range.to);
  }

  const totalBalance = entries.length ? entries[entries.length - 1].runningBalance : openingBalance;

  function exportPDF() {
    const openingRow = fyFilter
      ? `<tr><td></td><td><strong>Opening Balance</strong></td><td></td><td></td><td><strong>${formatBalance(openingBalance)}</strong></td></tr>`
      : "";
    const rows = entries
      .map(
        (e) => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.particular}</td>
        <td>${formatINR(e.debit ? e.debit : 0)}</td>
        <td>${e.credit ? formatINR(e.credit) : ""}</td>
        <td>${formatBalance(e.runningBalance)}</td>
      </tr>`
      )
      .join("");
    const html = `
      <table>
        <thead>
          <tr><th>Doc/Transaction Date</th><th>Particular</th><th>Debit Amt</th><th>Credit Amt</th><th>Balance</th></tr>
        </thead>
        <tbody>${openingRow}${rows}</tbody>
      </table>
      <p style="text-align:right; margin-top:14px"><strong>Total Balance: ${formatBalance(totalBalance)}</strong></p>
    `;
    printReport(`Account Ledger — ${entityName}`, html, `${entityType === "buyer" ? "Buyer" : "Mill"} Account${fyFilter ? ` · ${fyFilter}` : ""} · Generated ${new Date().toLocaleDateString("en-IN")}`);
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

      <div style={{ ...styles.row3 }}>
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
          <SearchableSelect
            value={entityId}
            onChange={setEntityId}
            options={entities.map((e) => ({ id: e.id, label: e.name }))}
            placeholder={`Select ${entityType}`}
          />
        </div>
        <div>
          <label style={styles.label}>Financial Year</label>
          <FYSelect value={fyFilter} onChange={setFyFilter} fys={availableFYs} />
        </div>
      </div>

      {!entityId && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          Select a {entityType} to view their ledger.
        </div>
      )}

      {entityId && (
        <div style={{ ...styles.card, overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Doc / Transaction Date</th>
                <th style={styles.th}>Particular</th>
                <th style={styles.th}>Debit Amt</th>
                <th style={styles.th}>Credit Amt</th>
                <th style={styles.th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {fyFilter && (
                <tr>
                  <td style={styles.td}></td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>Opening Balance</td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{formatBalance(openingBalance)}</td>
                </tr>
              )}
              {entries.map((e, i) => (
                <tr key={i}>
                  <td style={styles.td}>{formatDate(e.date)}</td>
                  <td style={{ ...styles.td, whiteSpace: "normal" }}>{e.particular}</td>
                  <td style={styles.td}>{e.debit ? formatINR(e.debit) : ""}</td>
                  <td style={styles.td}>{e.credit ? formatINR(e.credit) : ""}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{formatBalance(e.runningBalance)}</td>
                </tr>
              ))}
              {entries.length === 0 && !fyFilter && (
                <tr>
                  <td style={styles.td} colSpan={5}>
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {(entries.length > 0 || fyFilter) && (
            <div style={{ textAlign: "right", marginTop: 10, fontWeight: 800 }}>
              Total Balance: {formatBalance(totalBalance)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
