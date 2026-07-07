// src/tabs/Dashboard.jsx
import React from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { computeInvoices, invoiceWithStatus } from "../lib/calc";

export default function Dashboard({ data }) {
  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  const invoices = computeInvoices(data.indents, data.mills).map((inv) => invoiceWithStatus(inv, data.collections));

  const totalSale = invoices.reduce((s, i) => s + i.value, 0);
  const totalCollection = data.collections.reduce(
    (s, c) => s + (c.allocations || []).reduce((s2, a) => s2 + (Number(a.amount) || 0) + (Number(a.cdAmount) || 0), 0),
    0
  );
  const totalCommissionRealized = invoices.reduce((s, i) => s + i.commissionRealized, 0);
  const totalCommissionAccrued = invoices.reduce((s, i) => s + i.commissionAccrued, 0);

  const commissionByBuyer = {};
  const commissionByMill = {};
  const collectionByBuyer = {};

  invoices.forEach((inv) => {
    const bName = buyerName(inv.buyerId);
    const mName = millName(inv.millId);
    commissionByBuyer[bName] = (commissionByBuyer[bName] || 0) + inv.commissionRealized + inv.commissionAccrued;
    commissionByMill[mName] = (commissionByMill[mName] || 0) + inv.commissionRealized + inv.commissionAccrued;
  });

  data.collections.forEach((c) => {
    const bName = buyerName(c.buyerId);
    const amt = (c.allocations || []).reduce((s, a) => s + (Number(a.amount) || 0) + (Number(a.cdAmount) || 0), 0);
    collectionByBuyer[bName] = (collectionByBuyer[bName] || 0) + amt;
  });

  const pendingIndents = data.indents.filter((i) => !["fulfilled", "cancelled", "closed"].includes(i.status)).length;

  return (
    <div>
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Indents</div>
          <div style={styles.statValue}>{data.indents.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending / Open</div>
          <div style={styles.statValue}>{pendingIndents}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Sale (Dispatched)</div>
          <div style={styles.statValue}>{formatINR(totalSale)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Collection</div>
          <div style={styles.statValue}>{formatINR(totalCollection)}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: colors.success }}>
          <div style={styles.statLabel}>Commission Realized</div>
          <div style={{ ...styles.statValue, color: colors.success }}>{formatINR(totalCommissionRealized)}</div>
        </div>
        <div style={{ ...styles.statCard, borderColor: colors.mustard }}>
          <div style={styles.statLabel}>Commission Accrued (Pending)</div>
          <div style={{ ...styles.statValue, color: colors.mustard }}>{formatINR(totalCommissionAccrued)}</div>
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
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Customer-wise Collection</div>
        <MiniTable data={collectionByBuyer} />
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
