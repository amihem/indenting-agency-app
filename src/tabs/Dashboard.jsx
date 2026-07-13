// src/tabs/Dashboard.jsx
import React from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { getDashboardSummary, buyerOutstandingInvoices } from "../lib/calc";

export default function Dashboard({ data, setTab, goToReports }) {
  const summary = getDashboardSummary(data);

  // Calculate Top Outstanding
  const buyersWithOutstanding = data.buyers.map((buyer) => {
    const invoices = buyerOutstandingInvoices(buyer.id, data.indents, data.mills, data.collections);
    const balance = invoices.reduce((s, i) => s + i.balance, 0);
    return { name: buyer.name, balance };
  }).filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);

  // Quick stats for the "all modules" card grid
  const pendingIndents = data.indents.filter(
    (i) => !["fulfilled", "cancelled", "closed"].includes(i.status)
  ).length;
  const totalDispatchEntries = data.indents.reduce((s, i) => s + (i.dispatches || []).length, 0);
  const totalCashCollected = data.collections.reduce(
    (s, c) => s + (c.allocations || []).reduce((s2, a) => s2 + (Number(a.amount) || 0), 0),
    0
  );
  const debitNoteTotal = (data.debitNotes || []).reduce((s, n) => s + (Number(n.amount) || 0), 0);
  const creditNoteTotal = (data.creditNotes || []).reduce((s, n) => s + (Number(n.amount) || 0), 0);

  const modules = [
    {
      key: "indents",
      icon: "📝",
      label: "Indents",
      value: `${data.indents.length} total`,
      sub: `${pendingIndents} pending`,
      color: "#2b6cb0",
      onClick: () => setTab && setTab("indents"),
    },
    {
      key: "dispatch",
      icon: "🚚",
      label: "Dispatch",
      value: `${totalDispatchEntries} entries`,
      color: "#2f855a",
      onClick: () => setTab && setTab("dispatch"),
    },
    {
      key: "collections",
      icon: "💵",
      label: "Collections",
      value: formatINR(totalCashCollected),
      color: "#2c7a7b",
      onClick: () => setTab && setTab("collections"),
    },
    {
      key: "debitnotes",
      icon: "🧾",
      label: "Debit Note",
      value: formatINR(debitNoteTotal),
      sub: `${(data.debitNotes || []).length} notes`,
      color: "#c53030",
      onClick: () => setTab && setTab("debitnotes"),
    },
    {
      key: "creditnotes",
      icon: "🧮",
      label: "Credit Note",
      value: formatINR(creditNoteTotal),
      sub: `${(data.creditNotes || []).length} notes`,
      color: "#276749",
      onClick: () => setTab && setTab("creditnotes"),
    },
    {
      key: "ledger",
      icon: "📒",
      label: "Ledger",
      value: "View accounts",
      color: "#553c9a",
      onClick: () => setTab && setTab("ledger"),
    },
    {
      key: "masters",
      icon: "⚙️",
      label: "Masters",
      value: `${data.mills.length} mills · ${data.buyers.length} buyers · ${data.products.length} products`,
      color: "#4a5568",
      onClick: () => setTab && setTab("masters"),
    },
  ];

  return (
    <div>
      {/* Top Hero Card - Commission */}
      <div style={{ backgroundColor: "#1a365d", borderRadius: 12, padding: 24, color: "#fff", marginBottom: 16, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#cbd5e0", marginBottom: 8, textTransform: "uppercase" }}>
          Commission Earned (On Payments)
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#f6e05e" }}>
          {formatINR(summary.totalCommissionRealized)}
        </div>
        <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>
          Calculated on actual payments received
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ ...styles.card, marginBottom: 0, borderLeft: `4px solid #3182ce` }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🏪</div>
          <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Total Sales</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#3182ce" }}>{formatINR(summary.totalSale)}</div>
        </div>
        
        <div style={{ ...styles.card, marginBottom: 0, borderLeft: `4px solid #38a169` }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>✅</div>
          <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Total Paid</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#38a169" }}>{formatINR(summary.totalPaid)}</div>
        </div>

        <div style={{ ...styles.card, marginBottom: 0, borderLeft: `4px solid #e53e3e` }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
          <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Outstanding</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#e53e3e" }}>{formatINR(summary.outstanding)}</div>
        </div>

        <div style={{ ...styles.card, marginBottom: 0, borderLeft: `4px solid #805ad5` }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>💰</div>
          <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Commission Pending</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#805ad5" }}>{formatINR(summary.totalCommissionAccrued)}</div>
        </div>
      </div>

      {/* Quick Action Buttons — Analytics / Outstanding / Aging / Reports */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <button onClick={() => setTab && setTab("analytics")} style={{ backgroundColor: "#3182ce", color: "#fff", border: "none", borderRadius: 8, padding: 16, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>📈</span> Analytics
        </button>
        <button onClick={() => setTab && setTab("outstanding")} style={{ backgroundColor: "#e53e3e", color: "#fff", border: "none", borderRadius: 8, padding: 16, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>⌛</span> Outstanding
        </button>
        <button onClick={() => (goToReports ? goToReports("ageing") : setTab && setTab("reports"))} style={{ backgroundColor: "#dd6b20", color: "#fff", border: "none", borderRadius: 8, padding: 16, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>📅</span> Aging
        </button>
        <button onClick={() => (goToReports ? goToReports("sales") : setTab && setTab("reports"))} style={{ backgroundColor: "#805ad5", color: "#fff", border: "none", borderRadius: 8, padding: 16, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>📋</span> Reports
        </button>
      </div>

      {/* All Modules — every other tab, one click away */}
      <div style={{ fontWeight: 700, fontSize: 13, color: colors.textMuted, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        All Modules
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {modules.map((m) => (
          <button
            key={m.key}
            onClick={m.onClick}
            style={{
              ...styles.card,
              margin: 0,
              textAlign: "left",
              border: "none",
              borderLeft: `4px solid ${m.color}`,
              cursor: "pointer",
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: m.color, marginTop: 2 }}>{m.value}</div>
            {m.sub && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{m.sub}</div>}
          </button>
        ))}
      </div>

      {/* Top Outstanding List */}
      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#e53e3e", marginBottom: 12, borderBottom: `1px solid ${colors.border}`, paddingBottom: 8 }}>
          Top Outstanding
        </div>
        {buyersWithOutstanding.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>No outstanding dues.</div>
        ) : (
          buyersWithOutstanding.map((b, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: idx !== buyersWithOutstanding.length - 1 ? `1px solid ${colors.border}` : "none" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#e53e3e" }}>{formatINR(b.balance)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}