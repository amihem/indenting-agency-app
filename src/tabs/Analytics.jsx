// src/tabs/Analytics.jsx
import React, { useMemo } from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { computeInvoices, invoiceWithStatus } from "../lib/calc";

export default function AnalyticsTab({ data }) {
  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "Unknown";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "Unknown";

  const analyticsData = useMemo(() => {
    const invoices = computeInvoices(data.indents, data.mills).map((inv) => invoiceWithStatus(inv, data.collections));

    const monthlyData = {};
    const buyerData = {};
    const millData = {};
    const productData = {};

    invoices.forEach((inv) => {
      // Monthly Grouping
      const monthYear = inv.invoiceDate ? inv.invoiceDate.substring(0, 7) : "Unknown"; // YYYY-MM
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { sales: 0, commission: 0, qty: 0 };
      }
      monthlyData[monthYear].sales += inv.value;
      monthlyData[monthYear].commission += inv.commissionRealized;
      monthlyData[monthYear].qty += inv.qty;

      // Top Entities
      const bName = buyerName(inv.buyerId);
      buyerData[bName] = (buyerData[bName] || 0) + inv.value;

      const mName = millName(inv.millId);
      millData[mName] = (millData[mName] || 0) + inv.value;

      const pName = inv.productName || "Other";
      productData[pName] = (productData[pName] || 0) + inv.value;
    });

    const sortTop5 = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      monthly: Object.entries(monthlyData).sort((a, b) => (a[0] > b[0] ? 1 : -1)),
      topBuyers: sortTop5(buyerData),
      topMills: sortTop5(millData),
      topProducts: sortTop5(productData),
    };
  }, [data]);

  const maxMonthlySale = Math.max(...analyticsData.monthly.map((m) => m[1].sales), 1);

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Business Analytics</div>
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Monthly Trends</div>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Month</th>
                <th style={styles.th}>Dispatch Qty</th>
                <th style={styles.th}>Total Sales</th>
                <th style={styles.th}>Comm. Realized</th>
                <th style={styles.th}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.monthly.map(([month, stats]) => (
                <tr key={month}>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>{month}</td>
                  <td style={styles.td}>{stats.qty}</td>
                  <td style={styles.td}>{formatINR(stats.sales)}</td>
                  <td style={{ ...styles.td, color: colors.success }}>{formatINR(stats.commission)}</td>
                  <td style={{ ...styles.td, width: "30%" }}>
                    <div style={{ width: "100%", backgroundColor: "#eee", borderRadius: 4, height: 12 }}>
                      <div
                        style={{
                          width: `${(stats.sales / maxMonthlySale) * 100}%`,
                          backgroundColor: colors.primary,
                          height: "100%",
                          borderRadius: 4,
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
              {analyticsData.monthly.length === 0 && (
                <tr><td colSpan={5} style={styles.td}>No data available for analytics.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.row3}>
        <TopCard title="Top 5 Buyers" data={analyticsData.topBuyers} />
        <TopCard title="Top 5 Mills" data={analyticsData.topMills} />
        <TopCard title="Top 5 Products" data={analyticsData.topProducts} />
      </div>
    </div>
  );
}

function TopCard({ title, data }) {
  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, borderBottom: `1px solid ${colors.border}`, paddingBottom: 8 }}>
        {title}
      </div>
      {data.length === 0 ? (
        <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>
      ) : (
        data.map(([name, value], idx) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
            <span>{idx + 1}. {name}</span>
            <span style={{ fontWeight: 600 }}>{formatINR(value)}</span>
          </div>
        ))
      )}
    </div>
  );
}