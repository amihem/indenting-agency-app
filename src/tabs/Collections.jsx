// src/tabs/Collections.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate, todayISO } from "../lib/storage";

export default function CollectionsTab({ data, addCollection, deleteCollection }) {
  const [form, setForm] = useState({
    buyerId: "",
    date: todayISO(),
    amount: "",
    mode: "NEFT",
    reference: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [filterBuyer, setFilterBuyer] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const canSubmit = form.buyerId && form.amount && Number(form.amount) > 0;

  function submit() {
    if (!canSubmit) return;
    addCollection({ ...form, amount: Number(form.amount) });
    setForm({ buyerId: "", date: todayISO(), amount: "", mode: "NEFT", reference: "" });
    setShowForm(false);
  }

  const visible = filterBuyer
    ? data.collections.filter((c) => c.buyerId === filterBuyer)
    : data.collections;
  const sorted = [...visible].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = visible.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Collections (Payments Received)</div>
        <button style={styles.btn} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Record Collection"}
        </button>
      </div>

      {showForm && (
        <div style={styles.card}>
          <label style={styles.label}>Buyer *</label>
          <select
            style={styles.input}
            value={form.buyerId}
            onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
          >
            <option value="">Select buyer</option>
            {data.buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Date</label>
              <input
                style={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Amount (₹) *</label>
              <input
                style={styles.input}
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Mode</label>
              <select
                style={styles.input}
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option>NEFT</option>
                <option>RTGS</option>
                <option>UPI</option>
                <option>Cheque</option>
                <option>Cash</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Reference No.</label>
              <input
                style={styles.input}
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>
          </div>

          <button style={styles.btn} disabled={!canSubmit} onClick={submit}>
            Save Collection
          </button>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <select
          style={{ ...styles.input, marginBottom: 0, width: "auto" }}
          value={filterBuyer}
          onChange={(e) => setFilterBuyer(e.target.value)}
        >
          <option value="">All buyers</option>
          {data.buyers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ ...styles.card, background: colors.indigo, color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Total Collections {filterBuyer ? "(filtered)" : ""}</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{formatINR(total)}</div>
      </div>

      {sorted.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          No collections recorded yet.
        </div>
      )}

      {sorted.map((c) => (
        <div
          key={c.id}
          style={{
            ...styles.listItem,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>{formatINR(c.amount)}</strong> from {buyerName(c.buyerId)}
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              {formatDate(c.date)} · {c.mode} {c.reference ? `· Ref: ${c.reference}` : ""}
            </div>
          </div>
          <button style={styles.btnDanger} onClick={() => deleteCollection(c.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
