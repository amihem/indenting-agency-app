// src/tabs/Dashboard.jsx
import React from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { getDashboardSummary } from "../lib/calc";

export default function Dashboard({ data }) {
  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  const summary = getDashboardSummary(data);

  const commissionByBuyer = {};
  const commissionByMill = {};
  const collectionCashByBuyer = {};

  summary.invoices.forEach((inv) => {
    const bName = buyerName(inv.buyerId);
    const mName = millName(inv.millId);
    commissionByBuyer[bName] = (commissionByBuyer[bName] || 0) + inv.commissionRealized + inv.commissionAccrued;
    commissionByMill[mName] = (commissionByMill[mName] || 0) + inv.commissionRealized + inv.commissionAccrued;
  });

  // Customer-wise Collection = Cash only
  data.collections.forEach((c) => {
    const bName = buyerName(c.buyerId);
    const cashAmt = (c.allocations || []).reduce((s, a) => s + (Number(a.amount) || 0), 0);
    collectionCashByBuyer[bName] = (collectionCashByBuyer[bName] || 0) + cashAmt;
  });

  return (
    <div>
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Sale</div>
          <div style={styles.statValue}>{formatINR(summary.totalSale)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Collection (Cash)</div>
          <div style={styles.statValue}>{formatINR(summary.totalCollectionCash)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total CD</div>
          <div style={styles.statValue}>{formatINR(summary.totalCD)}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: colors.danger }}>
          <div style={styles.statLabel}>Total Outstanding</div>
          <div style={{ ...styles.statValue, color: colors.danger }}>{formatINR(summary.outstanding)}</div>
        </div>
        
        {/* Commission Cards */}
        <div style={{ ...styles.statCard, borderColor: colors.success }}>
          <div style={styles.statLabel}>Commission Realized</div>
          <div style={{ ...styles.statValue, color: colors.success }}>{formatINR(summary.totalCommissionRealized)}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: colors.mustard }}>
          <div style={styles.statLabel}>Commission Pending</div>
          <div style={{ ...styles.statValue, color: colors.mustard }}>{formatINR(summary.totalCommissionAccrued)}</div>
        </div>

        {/* Dispatch & Other Metrics */}
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Dispatch Qty</div>
          <div style={styles.statValue}>{summary.pendingDispatchQty}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Dispatch Value</div>
          <div style={styles.statValue}>{formatINR(summary.pendingDispatchValue)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Overdue Outstanding</div>
          <div style={{...styles.statValue, color: colors.danger}}>{formatINR(summary.overdueOutstanding)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Today's Collection</div>
          <div style={styles.statValue}>{formatINR(summary.todaysCollection)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>This Month Collection</div>
          <div style={styles.statValue}>{formatINR(summary.thisMonthCollection)}</div>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Customer-wise Commission</div>
        <MiniTable data={commissionByBuyer} />
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Supplier (Mill)-wise Commission</div>
        <MiniTable data={commissionByMill} />
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Customer-wise Collection (Cash Only)</div>
        <MiniTable data={collectionCashByBuyer} />
      </div>
    </div>
  );
}

function MiniTable({ data }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <div style={{ color: colors.textMuted, fontSize: 13 }}>No data yet.</div>;
  }
  return (
    <table style={styles.table}>
      <tbody>
        {entries.map(([name, val]) => (
          <tr key={name}>
            <td style={styles.td}>{name}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{formatINR(val)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}