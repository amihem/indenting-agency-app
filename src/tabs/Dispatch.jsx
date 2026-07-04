// src/tabs/Dispatch.jsx
// A consolidated view of every dispatch across all indents — for quick
// tracking without opening each indent individually.
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatDate, formatINR } from "../lib/storage";
import { totalDispatchedQty } from "../lib/calc";
import { shareDispatch } from "../lib/whatsapp";

export default function DispatchTab({ data }) {
  const [search, setSearch] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);

  // Flatten: one row per dispatch entry, with its parent indent attached.
  let rows = [];
  data.indents.forEach((indent) => {
    (indent.dispatches || []).forEach((disp) => {
      rows.push({ indent, disp });
    });
  });

  rows.sort((a, b) => new Date(b.disp.date) - new Date(a.disp.date));

  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.indent.indentNumber.toLowerCase().includes(q) ||
        r.disp.lrNumber?.toLowerCase().includes(q) ||
        buyerName(r.indent.buyerId).toLowerCase().includes(q) ||
        millName(r.indent.millId).toLowerCase().includes(q)
    );
  }

  // Also show indents that are pending dispatch (nothing dispatched yet).
  const pendingIndents = data.indents.filter(
    (i) => i.status !== "cancelled" && totalDispatchedQty(i) < (Number(i.quantity) || 0)
  );

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Dispatch Tracking</div>
      </div>

      <input
        style={styles.input}
        placeholder="Search by Indent No, LR No, Buyer, or Mill"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {pendingIndents.length > 0 && (
        <div style={{ ...styles.card, borderColor: colors.mustard }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: colors.mustard }}>
            Awaiting Dispatch ({pendingIndents.length})
          </div>
          {pendingIndents.map((i) => {
            const dispatched = totalDispatchedQty(i);
            const remaining = (Number(i.quantity) || 0) - dispatched;
            return (
              <div key={i.id} style={{ fontSize: 13, padding: "6px 0" }}>
                <strong>{i.indentNumber}</strong> — {buyerName(i.buyerId)} ← {millName(i.millId)} ·{" "}
                {i.productName} · {remaining} {i.unit} pending
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Indent No</th>
              <th style={styles.th}>Buyer</th>
              <th style={styles.th}>Mill</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>LR No</th>
              <th style={styles.th}>Transporter</th>
              <th style={styles.th}>Invoice</th>
              <th style={styles.th}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ indent, disp }) => (
              <tr key={disp.id}>
                <td style={styles.td}>{formatDate(disp.date)}</td>
                <td style={styles.td}>{indent.indentNumber}</td>
                <td style={styles.td}>{buyerName(indent.buyerId)}</td>
                <td style={styles.td}>{millName(indent.millId)}</td>
                <td style={styles.td}>
                  {disp.qty} {indent.unit}
                </td>
                <td style={styles.td}>{disp.lrNumber || "—"}</td>
                <td style={styles.td}>{disp.transporter || "—"}</td>
                <td style={styles.td}>{disp.invoiceNumber || "—"}</td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.btnWhatsapp, padding: "4px 8px" }}
                    onClick={() => shareDispatch(indent, disp, getBuyer(indent.buyerId))}
                  >
                    WA
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={9}>
                  No dispatch entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
