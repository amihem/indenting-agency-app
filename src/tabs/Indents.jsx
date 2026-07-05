// src/tabs/Indents.jsx
import React, { useState } from "react";
import { styles, colors, statusColors } from "../styles";
import { formatINR, formatDate, todayISO } from "../lib/storage";
import { indentOrderValue, totalDispatchedQty, pendingQty } from "../lib/calc";
import { shareIndent, shareDispatch } from "../lib/whatsapp";
import { printReport } from "../lib/print";

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
    productId: "",
    productName: "",
    quantity: "",
    unit: "meters",
    rate: "",
    remark: "",
    deliveryInstruction: "",
    transport: "",
    packingInstruction: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);
  const getMill = (id) => data.mills.find((m) => m.id === id);

  const canSubmit = form.buyerId && form.millId && form.productId && form.quantity && form.rate;

  function submit() {
    if (!canSubmit) return;
    addIndent({
      ...form,
      quantity: Number(form.quantity),
      rate: Number(form.rate),
    });
    setForm({
      buyerId: "",
      millId: "",
      productId: "",
      productName: "",
      quantity: "",
      unit: "meters",
      rate: "",
      remark: "",
      deliveryInstruction: "",
      transport: "",
      packingInstruction: "",
    });
    setShowForm(false);
  }

  function closeIndent(indent) {
    const ok = window.confirm(
      `Close Indent ${indent.indentNumber}? This marks it closed regardless of pending quantity — use this when the buyer/mill has agreed to not fulfill the remaining balance.`
    );
    if (ok) updateIndent(indent.id, { status: "closed" });
  }

  function exportIndentPDF(indent) {
    const value = indentOrderValue(indent);
    const html = `
      <h2>Indent ${indent.indentNumber}</h2>
      <p>Date: ${formatDate(indent.date)}</p>
      <table>
        <tr><th>Buyer</th><td>${buyerName(indent.buyerId)}</td></tr>
        <tr><th>Mill</th><td>${millName(indent.millId)}</td></tr>
        <tr><th>Product</th><td>${indent.productName}</td></tr>
        <tr><th>Quantity</th><td>${indent.quantity} ${indent.unit}</td></tr>
        <tr><th>Rate</th><td>${formatINR(indent.rate)}</td></tr>
        <tr><th>Order Value</th><td>${formatINR(value)}</td></tr>
        <tr><th>Delivery Instruction</th><td>${indent.deliveryInstruction || "—"}</td></tr>
        <tr><th>Transport</th><td>${indent.transport || "—"}</td></tr>
        <tr><th>Packing Instruction</th><td>${indent.packingInstruction || "—"}</td></tr>
        <tr><th>Remark</th><td>${indent.remark || "—"}</td></tr>
        <tr><th>Status</th><td>${indent.status}</td></tr>
      </table>
    `;
    printReport(`Indent ${indent.indentNumber}`, html);
  }

  const visibleIndents = filterStatus ? data.indents.filter((i) => i.status === filterStatus) : data.indents;

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
          <div style={styles.row2}>
            <div>
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
            </div>
            <div>
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
            </div>
          </div>

          <label style={styles.label}>Product *</label>
          {data.products.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.danger, marginBottom: 12 }}>
              No products added yet. Go to the Products tab first and add at least one product.
            </div>
          ) : (
            <select
              style={styles.input}
              value={form.productId}
              onChange={(e) => {
                const p = data.products.find((prod) => prod.id === e.target.value);
                setForm({
                  ...form,
                  productId: e.target.value,
                  productName: p?.name || "",
                  unit: p?.unit || "meters",
                });
              }}
            >
              <option value="">Select product</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

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

          <label style={styles.label}>Rate (₹) *</label>
          <input
            style={styles.input}
            type="number"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
          />

          <label style={styles.label}>Delivery Instruction</label>
          <input
            style={styles.input}
            value={form.deliveryInstruction}
            onChange={(e) => setForm({ ...form, deliveryInstruction: e.target.value })}
          />

          <label style={styles.label}>Transport</label>
          <input
            style={styles.input}
            value={form.transport}
            onChange={(e) => setForm({ ...form, transport: e.target.value })}
          />

          <label style={styles.label}>Packing Instruction</label>
          <input
            style={styles.input}
            value={form.packingInstruction}
            onChange={(e) => setForm({ ...form, packingInstruction: e.target.value })}
          />

          <label style={styles.label}>Remark</label>
          <textarea
            style={{ ...styles.input, minHeight: 60 }}
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />

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
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ---------- Indent register table ---------- */}
      <div style={{ ...styles.card, overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Indent No</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Buyer</th>
              <th style={styles.th}>Product</th>
              <th style={styles.th}>Order Qty</th>
              <th style={styles.th}>Dispatch Qty</th>
              <th style={styles.th}>Pending Qty</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {visibleIndents.map((indent) => {
              const dispatched = totalDispatchedQty(indent);
              const pending = pendingQty(indent);
              const [bg, fg] = statusColors[indent.status] || statusColors.pending;
              return (
                <tr key={indent.id}>
                  <td style={styles.td}>
                    <button
                      style={{ background: "none", border: "none", color: colors.indigo, fontWeight: 700, cursor: "pointer", padding: 0 }}
                      onClick={() => setExpandedId(expandedId === indent.id ? null : indent.id)}
                    >
                      {indent.indentNumber}
                    </button>
                  </td>
                  <td style={styles.td}>{formatDate(indent.date)}</td>
                  <td style={styles.td}>{buyerName(indent.buyerId)}</td>
                  <td style={{ ...styles.td, whiteSpace: "normal" }}>{indent.productName}</td>
                  <td style={styles.td}>
                    {indent.quantity} {indent.unit}
                  </td>
                  <td style={styles.td}>
                    {dispatched} {indent.unit}
                  </td>
                  <td style={styles.td}>
                    {pending} {indent.unit}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.badge(bg, fg)}>{indent.status}</span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{ ...styles.btnGhost, padding: "4px 8px", fontSize: 11 }}
                      onClick={() => setExpandedId(expandedId === indent.id ? null : indent.id)}
                    >
                      {expandedId === indent.id ? "Hide" : "Details"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleIndents.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={9}>
                  No indents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Expanded detail card ---------- */}
      {visibleIndents
        .filter((i) => i.id === expandedId)
        .map((indent) => (
          <div key={indent.id} style={styles.listItem}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>{indent.indentNumber}</strong> — {millName(indent.millId)}
            </div>
            <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
              {indent.deliveryInstruction && <div>Delivery Instruction: {indent.deliveryInstruction}</div>}
              {indent.transport && <div>Transport: {indent.transport}</div>}
              {indent.packingInstruction && <div>Packing Instruction: {indent.packingInstruction}</div>}
              {indent.remark && <div>Remark: {indent.remark}</div>}
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
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <DispatchSection
              indent={indent}
              buyer={getBuyer(indent.buyerId)}
              addDispatch={addDispatch}
              deleteDispatch={deleteDispatch}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button
                style={styles.btnWhatsapp}
                onClick={() => shareIndent(indent, getBuyer(indent.buyerId), getMill(indent.millId))}
              >
                Share (WA)
              </button>
              <button style={styles.btnPdf} onClick={() => exportIndentPDF(indent)}>
                Export PDF
              </button>
              {indent.status !== "closed" && indent.status !== "cancelled" && (
                <button style={styles.btnGhost} onClick={() => closeIndent(indent)}>
                  Close Indent
                </button>
              )}
              <button style={styles.btnDanger} onClick={() => deleteIndent(indent.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

/* ---------- Dispatch sub-section, nested inside each indent's detail card ---------- */
function DispatchSection({ indent, buyer, addDispatch, deleteDispatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(),
    qty: "",
    invoiceNumber: "",
    invoiceDate: todayISO(),
    lrNumber: "",
    lrDate: todayISO(),
    transporter: "",
  });

  const dispatches = indent.dispatches || [];
  const totalDispatched = totalDispatchedQty(indent);
  const ordered = Number(indent.quantity) || 0;
  const remaining = Math.max(ordered - totalDispatched, 0);
  const canSubmit = form.qty && Number(form.qty) > 0;

  function submit() {
    if (!canSubmit) return;
    addDispatch(indent.id, { ...form, qty: Number(form.qty) });
    setForm({
      date: todayISO(),
      qty: "",
      invoiceNumber: "",
      invoiceDate: todayISO(),
      lrNumber: "",
      lrDate: todayISO(),
      transporter: "",
    });
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
              <label style={styles.label}>Mill Invoice Number</label>
              <input
                style={styles.input}
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Invoice Date</label>
              <input
                style={styles.input}
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
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
              <label style={styles.label}>LR Date</label>
              <input
                style={styles.input}
                type="date"
                value={form.lrDate}
                onChange={(e) => setForm({ ...form, lrDate: e.target.value })}
              />
            </div>
          </div>
          <label style={styles.label}>Transporter</label>
          <input
            style={styles.input}
            value={form.transporter}
            onChange={(e) => setForm({ ...form, transporter: e.target.value })}
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
            {disp.invoiceNumber ? ` · Inv: ${disp.invoiceNumber}` : ""}
            {disp.lrNumber ? ` · LR: ${disp.lrNumber}` : ""}
            {disp.transporter ? ` · ${disp.transporter}` : ""}
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
