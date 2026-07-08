// src/tabs/Analytics.jsx
import React, { useMemo } from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { computeInvoices, invoiceWithStatus, getDashboardSummary } from "../lib/calc";

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

  const summary = useMemo(() => getDashboardSummary(data), [data]);

  const maxMonthlySale = Math.max(...analyticsData.monthly.map((m) => m[1].sales), 1);
  const maxMonthlyCommission = Math.max(...analyticsData.monthly.map((m) => m[1].commission), 1);

  const donutColors = [colors.primary, colors.success, colors.mustard, colors.danger, colors.indigo, "#9CA3AF"];
  const totalBuyerValue = analyticsData.topBuyers.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Business Analytics</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard label="Total Sales" value={formatINR(summary.totalSale)} color={colors.primary} />
        <KpiCard label="Comm. Realized" value={formatINR(summary.totalCommissionRealized)} color={colors.success} />
        <KpiCard label="Comm. Accrued" value={formatINR(summary.totalCommissionAccrued)} color={colors.mustard} />
        <KpiCard label="Outstanding" value={formatINR(summary.outstanding)} color={colors.danger} />
        <KpiCard label="Overdue (30+ days)" value={formatINR(summary.overdueOutstanding)} color={colors.danger} />
        <KpiCard label="Pending Dispatch" value={formatINR(summary.pendingDispatchValue)} color={colors.indigo} />
      </div>

      <div style={styles.row2}>
        <div style={styles.card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Sales Trend</div>
          <LineChart data={analyticsData.monthly.map(([m, s]) => ({ label: m, value: s.sales }))} color={colors.primary} formatValue={formatINR} />
        </div>
        <div style={styles.card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Commission Realized Trend</div>
          <BarChart data={analyticsData.monthly.map(([m, s]) => ({ label: m, value: s.commission }))} color={colors.success} formatValue={formatINR} />
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Buyer-wise Sales Share</div>
        <DonutChart data={analyticsData.topBuyers} colors={donutColors} total={totalBuyerValue} formatValue={formatINR} />
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

function KpiCard({ label, value, color }) {
  return (
    <div style={{ ...styles.card, borderLeft: `4px solid ${color}`, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function LineChart({ data, color, formatValue }) {
  if (!data || data.length === 0) {
    return <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>;
  }
  const w = 500, h = 180, padX = 30, padY = 20;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = h - padY - (d.value / max) * (h - padY * 2);
    return { x, y, ...d };
  });
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={colors.border} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={path} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text x={p.x} y={h - 4} fontSize="9" textAnchor="middle" fill={colors.textMuted}>{p.label.slice(2)}</text>
          <text x={p.x} y={p.y - 8} fontSize="9" textAnchor="middle" fill={colors.textMuted}>
            {formatValue(p.value)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BarChart({ data, color, formatValue }) {
  if (!data || data.length === 0) {
    return <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>;
  }
  const w = 500, h = 180, padX = 30, padY = 20;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = (w - padX * 2) / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={colors.border} />
      {data.map((d, i) => {
        const barH = (d.value / max) * (h - padY * 2);
        const x = padX + i * barW + barW * 0.15;
        const y = h - padY - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW * 0.7} height={barH} fill={color} rx="2" />
            <text x={x + barW * 0.35} y={h - 4} fontSize="9" textAnchor="middle" fill={colors.textMuted}>{d.label.slice(2)}</text>
            <text x={x + barW * 0.35} y={y - 4} fontSize="9" textAnchor="middle" fill={colors.textMuted}>
              {formatValue(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ data, colors: palette, total, formatValue }) {
  if (!data || data.length === 0) {
    return <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>;
  }
  const size = 180, r = 70, cx = size / 2, cy = size / 2, stroke = 26;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        {data.map(([name, value], i) => {
          const frac = value / total;
          const dash = frac * circumference;
          const circle = (
            <circle
              key={name}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={palette[i % palette.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div style={{ fontSize: 12 }}>
        {data.map(([name, value], i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: palette[i % palette.length], display: "inline-block" }}></span>
            <span>{name} — {formatValue(value)} ({((value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
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