// src/tabs/Reports.jsx
import React, { useState, useMemo } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate } from "../lib/storage";
import { computeInvoices, invoiceWithStatus, getAgeingSummary } from "../lib/calc";
import { printReport } from "../lib/print";

export default function ReportsTab({ data }) {
  const [reportType, setReportType] = useState("outstanding");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  const allInvoices = useMemo(() => {
    return computeInvoices(data.indents, data.mills).map((inv) => invoiceWithStatus(inv, data.collections));
  }, [data.indents, data.mills, data.collections]);

  function handleExport() {
    let html = `<h2>${reportType.toUpperCase()} REPORT</h2><p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>`;
    
    if (reportType === "outstanding") {
      const rows = allInvoices.filter(i => i.balance > 0).map(r => `
        <tr><td>${formatDate(r.invoiceDate)}</td><td>${r.invoiceNo || r.indentNumber}</td>
        <td>${buyerName(r.buyerId)}</td><td>${millName(r.millId)}</td>
        <td>${formatINR(r.value)}</td><td>${formatINR(r.paidTotal)}</td><td>${formatINR(r.balance)}</td></tr>
      `).join("");
      html += `<table><thead><tr><th>Date</th><th>Invoice</th><th>Buyer</th><th>Mill</th><th>Inv Value</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>`;
    } 
    else if (reportType === "commission") {
      const rows = allInvoices.filter(i => i.commission > 0).map(r => `
        <tr><td>${formatDate(r.invoiceDate)}</td><td>${r.invoiceNo || r.indentNumber}</td>
        <td>${buyerName(r.buyerId)}</td><td>${formatINR(r.value)}</td>
        <td>${formatINR(r.commissionRealized)}</td><td>${formatINR(r.commissionAccrued)}</td></tr>
      `).join("");
      html += `<table><thead><tr><th>Date</th><th>Invoice</th><th>Buyer</th><th>Inv Value</th><th>Realized Comm.</th><th>Pending Comm.</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    else if (reportType === "ageing") {
      const buckets = getAgeingSummary(allInvoices);
      html += `<table><thead><tr><th>Bucket (Days)</th><th>Amount Pending</th></tr></thead><tbody>
        <tr><td>Current</td><td>${formatINR(buckets.current)}</td></tr>
        <tr><td>0-30 Days</td><td>${formatINR(buckets['0-30'])}</td></tr>
        <tr><td>31-60 Days</td><td>${formatINR(buckets['31-60'])}</td></tr>
        <tr><td>61-90 Days</td><td>${formatINR(buckets['61-90'])}</td></tr>
        <tr><td>91-120 Days</td><td>${formatINR(buckets['91-120'])}</td></tr>
        <tr><td>120+ Days</td><td>${formatINR(buckets['120+'])}</td></tr>
      </tbody></table>`;
    }

    printReport(`${reportType.toUpperCase()}_Report`, html);
  }

  const renderTable = () => {
    if (reportType === "outstanding") {
      const outstandingInvoices = allInvoices.filter(i => i.balance > 0);
      return (
        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Date</th><th style={styles.th}>Invoice / Indent</th><th style={styles.th}>Buyer</th><th style={styles.th}>Mill</th><th style={styles.th}>Balance</th></tr></thead>
          <tbody>
            {outstandingInvoices.map(inv => (
              <tr key={inv.key}>
                <td style={styles.td}>{formatDate(inv.invoiceDate)}</td>
                <td style={styles.td}>{inv.invoiceNo || inv.indentNumber}</td>
                <td style={styles.td}>{buyerName(inv.buyerId)}</td>
                <td style={styles.td}>{millName(inv.millId)}</td>
                <td style={{...styles.td, color: colors.danger, fontWeight: 'bold'}}>{formatINR(inv.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === "ageing") {
      const buckets = getAgeingSummary(allInvoices);
      return (
        <table style={{...styles.table, width: '50%'}}>
          <thead><tr><th style={styles.th}>Ageing Bucket</th><th style={styles.th}>Amount Pending</th></tr></thead>
          <tbody>
            <tr><td style={styles.td}>Current (Not Overdue)</td><td style={styles.td}>{formatINR(buckets.current)}</td></tr>
            <tr><td style={styles.td}>0 - 30 Days</td><td style={styles.td}>{formatINR(buckets['0-30'])}</td></tr>
            <tr><td style={styles.td}>31 - 60 Days</td><td style={{...styles.td, color: colors.mustard}}>{formatINR(buckets['31-60'])}</td></tr>
            <tr><td style={styles.td}>61 - 90 Days</td><td style={{...styles.td, color: colors.danger}}>{formatINR(buckets['61-90'])}</td></tr>
            <tr><td style={styles.td}>91 - 120 Days</td><td style={{...styles.td, color: colors.danger, fontWeight: 'bold'}}>{formatINR(buckets['91-120'])}</td></tr>
            <tr><td style={styles.td}>120+ Days</td><td style={{...styles.td, color: colors.danger, fontWeight: 'bold'}}>{formatINR(buckets['120+'])}</td></tr>
          </tbody>
        </table>
      );
    }

    if (reportType === "commission") {
        return (
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Date</th><th style={styles.th}>Invoice</th><th style={styles.th}>Buyer</th><th style={styles.th}>Realized Comm.</th><th style={styles.th}>Pending Comm.</th></tr></thead>
            <tbody>
              {allInvoices.map(inv => (
                <tr key={inv.key}>
                  <td style={styles.td}>{formatDate(inv.invoiceDate)}</td>
                  <td style={styles.td}>{inv.invoiceNo || inv.indentNumber}</td>
                  <td style={styles.td}>{buyerName(inv.buyerId)}</td>
                  <td style={{...styles.td, color: colors.success}}>{formatINR(inv.commissionRealized)}</td>
                  <td style={{...styles.td, color: colors.mustard}}>{formatINR(inv.commissionAccrued)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={styles.h2}>System Reports</div>
        <button style={styles.btnPdf} onClick={handleExport}>Export PDF / Print</button>
      </div>

      <div style={{ ...styles.card, marginBottom: 16 }}>
        <label style={{ ...styles.label, display: "inline-block", marginRight: 12 }}>Select Report:</label>
        <select style={{ ...styles.input, width: "300px", display: "inline-block" }} value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="outstanding">Outstanding Invoices</option>
          <option value="ageing">Outstanding Ageing Summary</option>
          <option value="commission">Commission Report</option>
        </select>
      </div>

      <div style={{ ...styles.card, overflowX: "auto" }}>
        {renderTable()}
      </div>
    </div>
  );
}