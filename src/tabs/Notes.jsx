// src/tabs/Notes.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate, todayISO } from "../lib/storage";

function NoteForm({ buyers, onAdd, label }) {
  const [form, setForm] = useState({ buyerId: "", date: todayISO(), amount: "", reason: "" });
  const [show, setShow] = useState(false);
  const canSubmit = form.buyerId && form.amount && Number(form.amount) > 0;

  function submit() {
    if (!canSubmit) return;
    onAdd({ ...form, amount: Number(form.amount) });
    setForm({ buyerId: "", date: todayISO(), amount: "", reason: "" });
    setShow(false);
  }

  return (
    <div>
      <button style={styles.btn} onClick={() => setShow((s) => !s)}>
        {show ? "Cancel" : `+ New ${label}`}
      </button>
      {show && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <label style={styles.label}>Buyer *</label>
          <select
            style={styles.input}
            value={form.buyerId}
            onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
          >
            <option value="">Select buyer</option>
            {buyers.map((b) => (
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
          <label style={styles.label}>Reason</label>
          <input
            style={styles.input}
            placeholder="e.g. Rate difference, damaged goods, short quantity"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <button style={styles.btn} disabled={!canSubmit} onClick={submit}>
            Save {label}
          </button>
        </div>
      )}
    </div>
  );
}

function NoteList({ items, buyers, onDelete, accentColor }) {
  const buyerName = (id) => buyers.find((b) => b.id === id)?.name || "—";
  const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = items.reduce((s, n) => s + (Number(n.amount) || 0), 0);

  return (
    <div>
      <div style={{ ...styles.card, borderColor: accentColor }}>
        <div style={{ fontSize: 12, color: colors.textMuted }}>Total</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: accentColor }}>{formatINR(total)}</div>
      </div>
      {sorted.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          None recorded yet.
        </div>
      )}
      {sorted.map((n) => (
        <div
          key={n.id}
          style={{
            ...styles.listItem,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong style={{ color: accentColor }}>{formatINR(n.amount)}</strong> —{" "}
            {buyerName(n.buyerId)}
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              {formatDate(n.date)} {n.reason ? `· ${n.reason}` : ""}
            </div>
          </div>
          <button style={styles.btnDanger} onClick={() => onDelete(n.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

export function DebitNoteTab({ data, addDebitNote, deleteDebitNote }) {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Debit Notes</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <NoteForm buyers={data.buyers} onAdd={addDebitNote} label="Debit Note" />
      </div>
      <NoteList
        items={data.debitNotes}
        buyers={data.buyers}
        onDelete={deleteDebitNote}
        accentColor={colors.danger}
      />
    </div>
  );
}

export function CreditNoteTab({ data, addCreditNote, deleteCreditNote }) {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Credit Notes</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <NoteForm buyers={data.buyers} onAdd={addCreditNote} label="Credit Note" />
      </div>
      <NoteList
        items={data.creditNotes}
        buyers={data.buyers}
        onDelete={deleteCreditNote}
        accentColor={colors.success}
      />
    </div>
  );
}
