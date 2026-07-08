// src/tabs/Reports.jsx
import React, { useState, useMemo } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate } from "../lib/storage";
import { computeInvoices, invoiceWithStatus, getAgeingSummary } from "../lib/calc";
import { printReport } from "../lib/print";

export default function ReportsTab({ data }) {
  const [reportType, setReportType] = useState("ageing");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  const allInvoices = useMemo(() => {
    return computeInvoices(data.indents, data.mills).map((inv) => invoiceWithStatus(inv, data.collections));
  }, [data.indents, data.mills, data.collections]);

  function handleExport() {
    let html = `<h2>${reportType.toUpperCase()} REPORT</h2><p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>`;
    
    if (reportType === "ageing") {
      html += `<h3>Overall Ageing Summary</h3><table><thead><tr><th>Bucket</th><th>Amount Pending</th></tr></thead><tbody>`;
      const allBuckets = getAgeingSummary(allInvoices);
      ['current', '0-30', '31-60', '61-90', '91-120', '120+'].forEach(b => {
          html += `<tr><td>${b} Days</td><td>${formatINR(allBuckets[b])}</td></tr>`;
      });
      html += `</tbody></table>`;

      data.buyers.forEach(buyer => {
         const buyerInvs = allInvoices.filter(i => i.buyerId === buyer.id);
         const buckets = getAgeingSummary(buyerInvs);
         if (buckets.total > 0) {
             html += `<h4>${buyer.name} (Total: ${formatINR(buckets.total)})</h4><table><thead><tr><th>Bucket</th><th>Amount</th></tr></thead><tbody>`;
             ['current', '0-30', '31-60', '61-90', '91-120', '120+'].forEach(b => {
                 if(buckets[b] > 0) html += `<tr><td>${b} Days</td><td>${formatINR(buckets[b])}</td></tr>`;
             });
             html += `</tbody></table>`;
         }
      });
    }

    printReport(`${reportType.toUpperCase()}_Report`, html);
  }

  const renderTable = () => {
    if (reportType === "ageing") {
      const allBuckets = getAgeingSummary(allInvoices);
      return (
        <div>
          <table style={{...styles.table, width: '100%', marginBottom: 20}}>
            <thead><tr><th style={styles.th} colSpan="2">Overall Ageing Summary</th></tr></thead>
            <tbody>
              <tr><td style={styles.td}>Current (Not Overdue)</td><td style={styles.td}>{formatINR(allBuckets.current)}</td></tr>
              <tr><td style={styles.td}>0 - 30 Days</td><td style={styles.td}>{formatINR(allBuckets['0-30'])}</td></tr>
              <tr><td style={styles.td}>31 - 60 Days</td><td style={{...styles.td, color: colors.mustard}}>{formatINR(allBuckets['31-60'])}</td></tr>
              <tr><td style={styles.td}>61 - 90 Days</td><td style={{...styles.td, color: colors.danger}}>{formatINR(allBuckets['61-90'])}</td></tr>
              <tr><td style={styles.td}>91 - 120 Days</td><td style={{...styles.td, color: colors.danger, fontWeight: 'bold'}}>{formatINR(allBuckets['91-120'])}</td></tr>
              <tr><td style={styles.td}>120+ Days</td><td style={{...styles.td, color: colors.danger, fontWeight: 'bold'}}>{formatINR(allBuckets['120+'])}</td></tr>
              <tr><td style={{...styles.td, fontWeight: 800}}>Total Outstanding</td><td style={{...styles.td, fontWeight: 800}}>{formatINR(allBuckets.total)}</td></tr>
            </tbody>
          </table>

          <div style={{fontWeight: 700, fontSize: 14, marginBottom: 12}}>Customer-wise Breakdown</div>
          {data.buyers.map(buyer => {
              const buyerInvs = allInvoices.filter(i => i.buyerId === buyer.id);
              const buckets = getAgeingSummary(buyerInvs);
              if (buckets.total === 0) return null;
              
              return (
                  <div key={buyer.id} style={{marginBottom: 16, padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8}}>
                      <div style={{fontWeight: 700, color: colors.primary, marginBottom: 8}}>{buyer.name} — Total: {formatINR(buckets.total)}</div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12}}>
                          {buckets.current > 0 && <div>Current: {formatINR(buckets.current)}</div>}
                          {buckets['0-30'] > 0 && <div>0-30: {formatINR(buckets['0-30'])}</div>}
                          {buckets['31-60'] > 0 && <div style={{color: colors.mustard}}>31-60: {formatINR(buckets['31-60'])}</div>}
                          {buckets['61-90'] > 0 && <div style={{color: colors.danger}}>61-90: {formatINR(buckets['61-90'])}</div>}
                          {buckets['91-120'] > 0 && <div style={{color: colors.danger}}>91-120: {formatINR(buckets['91-120'])}</div>}
                          {buckets['120+'] > 0 && <div style={{color: colors.danger, fontWeight: 'bold'}}>120+: {formatINR(buckets['120+'])}</div>}
                      </div>
                  </div>
              );
          })}
        </div>
      );
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={styles.h2}>System Reports</div>
        <button style={styles.btnPdf} onClick={handleExport}>Export PDF</button>
      </div>
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <label style={{ ...styles.label }}>Select Report:</label>
        <select style={{ ...styles.input }} value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="ageing">Outstanding Ageing Summary</option>
        </select>
      </div>
      <div style={{ ...styles.card, overflowX: "auto" }}>
        {renderTable()}
      </div>
    </div>
  );
}