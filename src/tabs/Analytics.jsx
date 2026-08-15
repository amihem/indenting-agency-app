// src/tabs/Analytics.jsx
import React, { useMemo, useState } from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { computeInvoices, invoiceWithStatus, getDashboardSummary } from "../lib/calc";
import { getFY, collectFYs, matchesFY, FYSelect } from "../lib/fy.jsx";

const GRANULARITIES = [
  ["year", "Year"],
  ["quarter", "Quarter"],
  ["month", "Month"],
  ["day", "Date"],
];

function getPeriodKey(dateStr, granularity) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  if (granularity === "year") return getFY(dateStr); // Indian financial year, matches the rest of the app
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (granularity === "quarter") return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  if (granularity === "month") return dateStr.slice(0, 7);
  return dateStr.slice(0, 10); // day
}

export default function AnalyticsTab({ data }) {
  const [fyFilter, setFyFilter] = useState("");
  const [granularity, setGranularity] = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "Unknown";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "Unknown";

  const allInvoicesForFY = useMemo(() => computeInvoices(data.indents, data.mills), [data.indents, data.mills]);
  const availableFYs = collectFYs([[allInvoicesForFY, (i) => i.invoiceDate]]);

  const analyticsData = useMemo(() => {
    const invoices = computeInvoices(data.indents, data.mills)
      .map((inv) => invoiceWithStatus(inv, data.collections))
      .filter((inv) => matchesFY(inv.invoiceDate, fyFilter))
      .filter((inv) => !fromDate || inv.invoiceDate >= fromDate)
      .filter((inv) => !toDate || inv.invoiceDate <= toDate);

    const periodData = {};
    const buyerData = {};
    const millData = {};
    const productData = {};

    invoices.forEach((inv) => {
      const key = getPeriodKey(inv.invoiceDate, granularity) || "Unknown";
      if (!periodData[key]) periodData[key] = { sales: 0, commission: 0, qty: 0, dispatches: 0 };
      periodData[key].sales += inv.value;
      periodData[key].commission += inv.commissionRealized;
      periodData[key].qty += inv.qty;
      periodData[key].dispatches += 1;

      const bName = buyerName(inv.buyerId);
      buyerData[bName] = (buyerData[bName] || 0) + inv.value;

      const mName = millName(inv.millId);
      millData[mName] = (millData[mName] || 0) + inv.value;

      const pName = inv.productName || "Other";
      productData[pName] = (productData[pName] || 0) + inv.value;
    });

    const sortTop5 = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      invoices,
      periods: Object.entries(periodData).sort((a, b) => (a[0] > b[0] ? 1 : -1)),
      topBuyers: sortTop5(buyerData),
      topMills: sortTop5(millData),
      topProducts: sortTop5(productData),
    };
  }, [data, fyFilter, fromDate, toDate, granularity]);

  // KPI cards recompute from the filtered invoices so the whole page stays
  // consistent with the selected period. Overdue / Pending Dispatch stay as
  // "right now" figures from the full dataset — a past period's overdue
  // balance doesn't disappear just because you're viewing an older window.
  const fullSummary = useMemo(() => getDashboardSummary(data), [data]);
  const isFiltered = fyFilter || fromDate || toDate;
  const summary = useMemo(() => {
    if (!isFiltered) return fullSummary;
    const inv = analyticsData.invoices;
    return {
      ...fullSummary,
      totalSale: inv.reduce((s, i) => s + i.value, 0),
      totalCommissionRealized: inv.reduce((s, i) => s + i.commissionRealized, 0),
      totalCommissionAccrued: inv.reduce((s, i) => s + i.commissionAccrued, 0),
      outstanding: inv.reduce((s, i) => s + i.balance, 0),
    };
  }, [fullSummary, analyticsData, isFiltered]);

  const maxPeriodSale = Math.max(...analyticsData.periods.map((m) => m[1].sales), 1);

  const donutColors = [colors.primary, colors.success, colors.mustard, colors.danger, colors.indigo, "#9CA3AF"];
  const totalBuyerValue = analyticsData.topBuyers.reduce((s, [, v]) => s + v, 0) || 1;

  const periodLabel = (key) => {
    if (granularity === "day") {
      const d = new Date(key);
      return isNaN(d) ? key : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    }
    if (granularity === "month") {
      const d = new Date(key + "-01");
      return isNaN(d) ? key : d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    }
    return key; // year (FY23-24) and quarter (2024-Q2) are already readable
  };

  function clearFilters() {
    setFyFilter("");
    setFromDate("");
    setToDate("");
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Business Analytics</div>
      </div>

      {/* Filter bar: FY quick-filter + custom date range, independent of chart granularity */}
      <div style={{ ...styles.card, background: colors.bg }}>
        <div style={styles.row3}>
          <div>
            <label style={styles.label}>Financial Year</label>
            <FYSelect value={fyFilter} onChange={setFyFilter} fys={availableFYs} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={styles.label}>From Date</label>
            <input style={{ ...styles.input, marginBottom: 0 }} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>To Date</label>
            <input style={{ ...styles.input, marginBottom: 0 }} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
        {isFiltered && (
          <button style={{ ...styles.btnGhost, marginTop: 10, fontSize: 12, padding: "6px 12px" }} onClick={clearFilters}>
            Clear Filters
          </button>
        )}

        <div style={{ marginTop: 14 }}>
          <label style={styles.label}>Chart Grouping</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GRANULARITIES.map(([key, label]) => (
              <button key={key} style={styles.chip(granularity === key)} onClick={() => setGranularity(key)}>
                {label}
              </button>
            ))}
          </div>
          {granularity === "day" && analyticsData.periods.length > 60 && (
            <div style={{ fontSize: 11, color: colors.mustard, marginTop: 6 }}>
              Tip: {analyticsData.periods.length} days shown — narrow the From/To range above for a clearer chart.
            </div>
          )}
        </div>
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
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            Sales Trend <span style={{ fontWeight: 400, color: colors.textMuted, fontSize: 12 }}>(by {granularity})</span>
          </div>
          <LineChart data={analyticsData.periods.map(([k, s]) => ({ label: periodLabel(k), value: s.sales }))} color={colors.primary} formatValue={formatINR} />
        </div>
        <div style={styles.card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            Commission Realized <span style={{ fontWeight: 400, color: colors.textMuted, fontSize: 12 }}>(by {granularity})</span>
          </div>
          <BarChart data={analyticsData.periods.map(([k, s]) => ({ label: periodLabel(k), value: s.commission }))} color={colors.success} formatValue={formatINR} />
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Buyer-wise Sales Share</div>
        <DonutChart data={analyticsData.topBuyers} colors={donutColors} total={totalBuyerValue} formatValue={formatINR} />
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
          {GRANULARITIES.find(([k]) => k === granularity)[1]}-wise Trend Table
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{GRANULARITIES.find(([k]) => k === granularity)[1]}</th>
                <th style={styles.th}>Dispatches</th>
                <th style={styles.th}>Dispatch Qty</th>
                <th style={styles.th}>Total Sales</th>
                <th style={styles.th}>Comm. Realized</th>
                <th style={styles.th}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.periods.map(([period, stats]) => (
                <tr key={period}>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>{periodLabel(period)}</td>
                  <td style={styles.td}>{stats.dispatches}</td>
                  <td style={styles.td}>{stats.qty}</td>
                  <td style={styles.td}>{formatINR(stats.sales)}</td>
                  <td style={{ ...styles.td, color: colors.success }}>{formatINR(stats.commission)}</td>
                  <td style={{ ...styles.td, width: "30%" }}>
                    <div style={{ width: "100%", backgroundColor: "#eee", borderRadius: 4, height: 12 }}>
                      <div
                        style={{
                          width: `${(stats.sales / maxPeriodSale) * 100}%`,
                          backgroundColor: colors.primary,
                          height: "100%",
                          borderRadius: 4,
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
              {analyticsData.periods.length === 0 && (
                <tr><td colSpan={6} style={styles.td}>No data available for the selected filters.</td></tr>
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
  const skipLabels = data.length > 14 ? Math.ceil(data.length / 14) : 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={colors.border} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={path} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={color} />
          {i % skipLabels === 0 && (
            <text x={p.x} y={h - 4} fontSize="8" textAnchor="middle" fill={colors.textMuted}>
              {p.label}
            </text>
          )}
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
  const skipLabels = data.length > 14 ? Math.ceil(data.length / 14) : 1;

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
            {i % skipLabels === 0 && (
              <text x={x + barW * 0.35} y={h - 4} fontSize="8" textAnchor="middle" fill={colors.textMuted}>
                {d.label}
              </text>
            )}
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
