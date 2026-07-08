// src/tabs/Analytics.jsx
import React from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate } from "../lib/storage";
import { computeInvoices, invoiceWithStatus } from "../lib/calc";

export default function AnalyticsTab({ data }) {
  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  const invoices = computeInvoices(data.indents, data.mills).map((inv) => invoiceWithStatus(inv, data.collections));
  const maxCreditDays = data.settings.cdPolicy.maxCreditDays || 120;

  /* Top Buyers by Sales */
  const salesByBuyer = {};
  invoices.forEach((i) => (salesByBuyer[i.buyerId] = (salesByBuyer[i.buyerId] || 0) + i.value));
  const topBuyers = Object.entries(salesByBuyer).sort((a, b) => b[1] - a[1]).slice(0, 5);

  /* Top Mills by Volume (qty) */
  const volumeByMill = {};
  invoices.forEach((i) => (volumeByMill[i.millId] = (volumeByMill[i.millId] || 0) + i.qty));
  const topMills = Object.entries(volumeByMill).sort((a, b) => b[1] - a[1]).slice(0, 5);

  /* Overdue invoices — pending balance beyond the max credit period */
  const overdue = invoices.filter((i) => i.balance > 0.5 && i.days > maxCreditDays).sort((a, b) => b.days - a.days);
  const overdueTotal = overdue.reduce((s, i) => s + i.balance, 0);

  /* Average CD % actually given, across collections */
  let cdSum = 0;
  let cdCount = 0;
  data.collections.forEach((c) => {
    (c.allocations || []).forEach((a) => {
      if (Number(a.cdAmount) > 0) {
        cdSum += Number(a.cdPct) || 0;
        cdCount += 1;
      }
    });
  });
  const avgCdPct = cdCount > 0 ? (cdSum / cdCount).toFixed(2) : 0;

  /* Month-wise sales trend (based on invoice/dispatch date) */
  const salesByMonth = {};
  invoices.forEach((i) => {
    const d = new Date(i.invoiceDate);
    if (isNaN(d)) return;
    const key = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
    salesByMonth[key] = (salesByMonth[key] || 0) + i.value;
  });
  const monthEntries = Object.entries(salesByMonth).sort((a, b) => new Date("1 " + a[0]) - new Date("1 " + b[0]));
  const maxMonthVal = Math.max(1, ...monthEntries.map(([, v]) => v));

  return (
    <div>
      <div style={styles.h2}>Analytics</div>

      <div style={{ ...styles.statGrid, marginTop: 12 }}>
        <div style={{ ...styles.statCard, borderColor: colors.danger }}>
          <div style={styles.statLabel}>Overdue Invoices (beyond {maxCreditDays}d)</div>
          <div style={{ ...styles.statValue, color: colors.danger }}>{overdue.length}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: colors.danger }}>
          <div style={styles.statLabel}>Overdue Amount</div>
          <div style={{ ...styles.statValue, color: colors.danger }}>{formatINR(overdueTotal)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Average CD Given</div>
          <div style={styles.statValue}>{avgCdPct}%</div>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Top 5 Buyers by Sales</div>
        {topBuyers.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>
        ) : (
          <table style={styles.table}>
            <tbody>
              {topBuyers.map(([id, val]) => (
                <tr key={id}>
                  <td style={styles.td}>{buyerName(id)}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{formatINR(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Top 5 Mills by Volume</div>
        {topMills.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>
        ) : (
          <table style={styles.table}>
            <tbody>
              {topMills.map(([id, qty]) => (
                <tr key={id}>
                  <td style={styles.td}>{millName(id)}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{qty.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Month-wise Sales Trend</div>
        {monthEntries.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>
        ) : (
          <div>
            {monthEntries.map(([month, val]) => (
              <div key={month} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{month}</span>
                  <span style={{ fontWeight: 700 }}>{formatINR(val)}</span>
                </div>
                <div style={{ background: colors.bg, borderRadius: 4, height: 8 }}>
                  <div
                    style={{
                      width: `${(val / maxMonthVal) * 100}%`,
                      background: colors.indigo,
                      height: 8,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Overdue Invoice Detail</div>
        {overdue.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>No overdue invoices. 🎉</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Inv Date</th>
                  <th style={styles.th}>Inv No</th>
                  <th style={styles.th}>Buyer</th>
                  <th style={styles.th}>Mill</th>
                  <th style={styles.th}>Balance</th>
                  <th style={styles.th}>Days</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((i) => (
                  <tr key={i.key}>
                    <td style={styles.td}>{formatDate(i.invoiceDate)}</td>
                    <td style={styles.td}>{i.invoiceNo || i.indentNumber}</td>
                    <td style={styles.td}>{buyerName(i.buyerId)}</td>
                    <td style={styles.td}>{millName(i.millId)}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: colors.danger }}>{formatINR(i.balance)}</td>
                    <td style={styles.td}>{i.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
