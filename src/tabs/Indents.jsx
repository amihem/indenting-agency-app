// src/tabs/Indents.jsx
import React, { useState } from "react";
import { styles, colors, statusColors } from "../styles";
import { formatINR, formatDate, todayISO } from "../lib/storage";
import { indentValue, totalDispatchedQty } from "../lib/calc";
import { shareIndent, shareDispatch } from "../lib/whatsapp";

export default function IndentsTab({
  data,
  addIndent,
  updateIndent,
  deleteIndent,
  addDispatch,
  deleteDispatch,
}) {
  const [form, setForm] = useState({
    buyerId: "",
    millId: "",
    productName: "",
    quantity: "",
    unit: "meters",
    rate: "",
    commissionPct: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);
  const getMill = (id) => data.mills.find((m) => m.id === id);

  const canSubmit =
    form.buyerId && form.millId && form.productName && form.quantity && form.rate;

  function submit() {
    if (!canSubmit) return;
    addIndent({
      ...form,
      quantity: Number(form.quantity),
      rate: Number(form.rate),
      commissionPct: Number(form.commissionPct) || 0,
    });
    setForm({
      buyerId: "",
      millId: "",
      productName: "",
      quantity: "",
      unit: "meters",
      rate: "",
      commissionPct: "",
    });
    setShowForm(false);
  }

  const visibleIndents = filterStatus
    ? data.indents.filter((i) => i.status === filterStatus)
    : data.indents;

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Indents (Orders)</div>
        <button style={styles.btn} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New Indent"}
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

          <label style={styles.label}>Mill *</label>
          <select
            style={styles.input}
            value={form.millId}
            onChange={(e) => setForm({ ...form, millId: e.target.value })}
          >
            <option value="">Select mill</option>
            {data.mills.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <label style={styles.label}>Product / Quality *</label>
          <input
            style={styles.input}
            placeholder="e.g. Cotton Poplin, 58 inch, White"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
          />

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Quantity *</label>
              <input
                style={styles.input}
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Unit</label>
              <select
                style={styles.input}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="meters">Meters</option>
                <option value="kg">Kg</option>
              </select>
            </div>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Rate (₹) *</label>
              <input
                style={styles.input}
                type="number"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Commission %</label>
              <input
                style={styles.input}
                type="number"
                value={form.commissionPct}
                onChange={(e) => setForm({ ...form, commissionPct: e.target.value })}
              />
            </div>
          </div>

          <button style={styles.btn} disabled={!canSubmit} onClick={submit}>
            Save Indent
          </button>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <select
          style={{ ...styles.input, marginBottom: 0, width: "auto" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="partial_dispatch">Partial Dispatch</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {visibleIndents.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          No indents found. Add Mills and Buyers first, then create your first indent.
        </div>
      )}

      {visibleIndents.map((indent) => {
        const value = indentValue(indent);
        const [bg, fg] = statusColors[indent.status] || statusColors.pending;
        return (
          <div key={indent.id} style={styles.listItem}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <strong>{indent.indentNumber}</strong>
              <span style={styles.badge(bg, fg)}>{indent.status}</span>
            </div>
            <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
              {formatDate(indent.date)} · {buyerName(indent.buyerId)} ← {millName(indent.millId)}
            </div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              {indent.productName} — {indent.quantity} {indent.unit} @ {formatINR(indent.rate)}
              <br />
              Value: <strong>{formatINR(value)}</strong> · Commission %: {indent.commissionPct}%
            </div>

            <div style={{ marginBottom: 8 }}>
              <select
                style={{ ...styles.input, marginBottom: 0, width: "auto", padding: "6px 8px" }}
                value={indent.status}
                onChange={(e) => updateIndent(indent.id, { status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="partial_dispatch">Partial Dispatch</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <DispatchSection
              indent={indent}
              buyer={getBuyer(indent.buyerId)}
              addDispatch={addDispatch}
              deleteDispatch={deleteDispatch}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                style={styles.btnWhatsapp}
                onClick={() => shareIndent(indent, getBuyer(indent.buyerId), getMill(indent.millId))}
              >
                Share Indent (WA)
              </button>
              <button style={styles.btnDanger} onClick={() => deleteIndent(indent.id)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Dispatch sub-section, nested inside each indent card ---------- */
function DispatchSection({ indent, buyer, addDispatch, deleteDispatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(),
    qty: "",
    lrNumber: "",
    transporter: "",
    invoiceNumber: "",
  });

  const dispatches = indent.dispatches || [];
  const totalDispatched = totalDispatchedQty(indent);
  const ordered = Number(indent.quantity) || 0;
  const remaining = Math.max(ordered - totalDispatched, 0);
  const canSubmit = form.qty && Number(form.qty) > 0;

  function submit() {
    if (!canSubmit) return;
    addDispatch(indent.id, { ...form, qty: Number(form.qty) });
    setForm({ date: todayISO(), qty: "", lrNumber: "", transporter: "", invoiceNumber: "" });
    setShowForm(false);
  }

  return (
    <div style={{ borderTop: `1px dashed ${colors.border}`, marginTop: 10, paddingTop: 10 }}>
      <div style={{ ...styles.sectionHeader, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          Dispatch: {totalDispatched} / {ordered} {indent.unit}
          {remaining > 0 && (
            <span style={{ color: colors.textMuted, fontWeight: 500 }}>
              {" "}
              · {remaining} {indent.unit} remaining
            </span>
          )}
        </div>
        <button style={styles.btnGhost} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add Dispatch"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...styles.card, padding: 12, marginBottom: 10 }}>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Dispatch Date</label>
              <input
                style={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Quantity Dispatched *</label>
              <input
                style={styles.input}
                type="number"
                placeholder={`out of ${remaining} remaining`}
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </div>
          </div>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>LR Number</label>
              <input
                style={styles.input}
                placeholder="Lorry Receipt No."
                value={form.lrNumber}
                onChange={(e) => setForm({ ...form, lrNumber: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Transporter</label>
              <input
                style={styles.input}
                value={form.transporter}
                onChange={(e) => setForm({ ...form, transporter: e.target.value })}
              />
            </div>
          </div>
          <label style={styles.label}>Mill Invoice Number</label>
          <input
            style={styles.input}
            value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
          />
          <button style={styles.btn} disabled={!canSubmit} onClick={submit}>
            Save Dispatch Entry
          </button>
        </div>
      )}

      {dispatches.map((disp) => (
        <div
          key={disp.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            padding: "6px 0",
            borderBottom: `1px solid ${colors.border}`,
            gap: 6,
          }}
        >
          <div>
            <strong>
              {disp.qty} {indent.unit}
            </strong>{" "}
            on {formatDate(disp.date)}
            {disp.lrNumber ? ` · LR: ${disp.lrNumber}` : ""}
            {disp.transporter ? ` · ${disp.transporter}` : ""}
            {disp.invoiceNumber ? ` · Inv: ${disp.invoiceNumber}` : ""}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={{ ...styles.btnWhatsapp, padding: "3px 8px" }}
              onClick={() => shareDispatch(indent, disp, buyer)}
            >
              WA
            </button>
            <button
              style={{ ...styles.btnDanger, padding: "3px 8px" }}
              onClick={() => deleteDispatch(indent.id, disp.id)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
