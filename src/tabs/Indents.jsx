// src/tabs/Indents.jsx
import React, { useState } from "react";
import { styles, colors, statusColors } from "../styles";
import { formatINR, formatDate, todayISO, ROLL_LENGTH_METERS } from "../lib/storage";
import { indentOrderValue, totalDispatchedQty, pendingQty, roundRupee } from "../lib/calc";
import { shareIndent } from "../lib/whatsapp";
import { printReport } from "../lib/print";

const emptyForm = {
  buyerId: "",
  millId: "",
  productId: "",
  productName: "",
  shade: "",
  orderIn: "meters", // "meters" | "rolls"
  rolls: "",
  quantity: "",
  unit: "meters",
  rate: "",
  remark: "",
  deliveryInstruction: "",
  transport: "",
  packingInstruction: "",
};

export default function IndentsTab({
  data,
  addIndent,
  updateIndent,
  deleteIndent,
  addDispatch,
  updateDispatch,
  deleteDispatch,
}) {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);
  const getMill = (id) => data.mills.find((m) => m.id === id);

  const canSubmit = form.buyerId && form.millId && form.productId && form.quantity && form.rate;

  function startEdit(indent) {
    setForm({
      buyerId: indent.buyerId,
      millId: indent.millId,
      productId: indent.productId || "",
      productName: indent.productName,
      shade: indent.shade || "",
      orderIn: indent.orderIn || "meters",
      rolls: indent.rolls || "",
      quantity: indent.quantity,
      unit: indent.unit,
      rate: indent.rate,
      remark: indent.remark || "",
      deliveryInstruction: indent.deliveryInstruction || "",
      transport: indent.transport || "",
      packingInstruction: indent.packingInstruction || "",
    });
    setEditingId(indent.id);
    setShowForm(true);
    setExpandedId(null);
  }

  function submit() {
    if (!canSubmit) return;
    const payload = { ...form, quantity: Number(form.quantity), rate: Number(form.rate) };
    if (editingId) {
      updateIndent(editingId, payload);
    } else {
      addIndent(payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function cancelForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function closeIndent(indent) {
    const ok = window.confirm(
      `Close Indent ${indent.indentNumber}? This marks it closed regardless of pending quantity.`
    );
    if (ok) updateIndent(indent.id, { status: "closed" });
  }

  function handleDeleteIndent(indent) {
    const ok = window.confirm(
      `⚠️ Delete Indent ${indent.indentNumber} permanently? This also removes all its dispatch entries. This cannot be undone.`
    );
    if (ok) deleteIndent(indent.id);
  }

  function exportIndentPDF(indent) {
    const value = indentOrderValue(indent);
    const buyer = getBuyer(indent.buyerId);
    const mill = getMill(indent.millId);

    const html = `
      <h2>Indent Confirmation</h2>
      <table>
        <tr><th>Indent No.</th><td>${indent.indentNumber}</td><th>Indent Date</th><td>${formatDate(indent.date)}</td></tr>
        <tr><th>Supplier (Mill)</th><td colspan="3">${mill?.name || "—"}${mill?.address ? " · " + mill.address : ""}${mill?.phone ? " · " + mill.phone : ""}</td></tr>
        <tr><th>Buyer</th><td colspan="3">${buyer?.name || "—"}${buyer?.address ? " · " + buyer.address : ""}${buyer?.phone ? " · " + buyer.phone : ""}</td></tr>
      </table>
      <table style="margin-top:14px">
        <thead><tr><th>Product</th><th>Shade/Dyeing</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>${indent.productName}</td>
            <td>${indent.shade || "—"}</td>
            <td>${indent.quantity} ${indent.unit}${indent.orderIn === "rolls" ? ` (${indent.rolls} rolls)` : ""}</td>
            <td>${formatINR(indent.rate)}</td>
            <td>${formatINR(value)}</td>
          </tr>
        </tbody>
      </table>
      <table style="margin-top:14px">
        <tr><th>Transport</th><td>${indent.transport || "—"}</td></tr>
        <tr><th>Delivery Instruction</th><td>${indent.deliveryInstruction || "—"}</td></tr>
        <tr><th>Packing Instruction</th><td>${indent.packingInstruction || "—"}</td></tr>
        <tr><th>Remark</th><td>${indent.remark || "—"}</td></tr>
      </table>
      <table style="margin-top:40px">
        <tr>
          <td style="border:none;width:50%;padding-top:40px;">_____________________<br/>Agent Signature</td>
          <td style="border:none;width:50%;padding-top:40px;">_____________________<br/>Buyer Signature (Confirmation)</td>
        </tr>
      </table>
    `;
    printReport(`Indent ${indent.indentNumber}`, html);
  }

  const visibleIndents = filterStatus ? data.indents.filter((i) => i.status === filterStatus) : data.indents;

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Indents (Orders)</div>
        <button style={styles.btn} onClick={() => (showForm ? cancelForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ New Indent"}
        </button>
      </div>

      {showForm && (
        <div style={styles.card}>
          {editingId && <div style={{ fontSize: 12, color: colors.mustard, marginBottom: 8, fontWeight: 700 }}>Editing Indent</div>}
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Buyer *</label>
              <select style={styles.input} value={form.buyerId} onChange={(e) => setForm({ ...form, buyerId: e.target.value })}>
                <option value="">Select buyer</option>
                {data.buyers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Mill *</label>
              <select style={styles.input} value={form.millId} onChange={(e) => setForm({ ...form, millId: e.target.value })}>
                <option value="">Select mill</option>
                {data.mills.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <label style={styles.label}>Product *</label>
          {data.products.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.danger, marginBottom: 12 }}>
              No products added yet. Add one in Masters → Products first.
            </div>
          ) : (
            <select
              style={styles.input}
              value={form.productId}
              onChange={(e) => {
                const p = data.products.find((prod) => prod.id === e.target.value);
                setForm({ ...form, productId: e.target.value, productName: p?.name || "", unit: p?.unit || "meters" });
              }}
            >
              <option value="">Select product</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <label style={styles.label}>Shade / Dyeing</label>
          <input style={styles.input} value={form.shade} onChange={(e) => setForm({ ...form, shade: e.target.value })} />

          <label style={styles.label}>Order In</label>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" checked={form.orderIn === "meters"} onChange={() => setForm({ ...form, orderIn: "meters" })} />
              Direct Quantity
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" checked={form.orderIn === "rolls"} onChange={() => setForm({ ...form, orderIn: "rolls" })} />
              No. of Rolls ({ROLL_LENGTH_METERS}m/roll)
            </label>
          </div>

          {form.orderIn === "rolls" ? (
            <div style={styles.row2}>
              <div>
                <label style={styles.label}>No. of Rolls *</label>
                <input
                  style={styles.input}
                  type="number"
                  value={form.rolls}
                  onChange={(e) => {
                    const rolls = e.target.value;
                    setForm({ ...form, rolls, quantity: rolls ? Number(rolls) * ROLL_LENGTH_METERS : "" });
                  }}
                />
              </div>
              <div>
                <label style={styles.label}>Quantity (auto-calculated)</label>
                <input style={{ ...styles.input, background: colors.bg }} value={form.quantity} readOnly />
              </div>
            </div>
          ) : (
            <div style={styles.row2}>
              <div>
                <label style={styles.label}>Quantity *</label>
                <input style={styles.input} type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <label style={styles.label}>Unit</label>
                <select style={styles.input} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="meters">Meters</option>
                  <option value="kg">Kg</option>
                </select>
              </div>
            </div>
          )}

          <label style={styles.label}>Rate (₹) *</label>
          <input style={styles.input} type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />

          <label style={styles.label}>Delivery Instruction</label>
          <input style={styles.input} value={form.deliveryInstruction} onChange={(e) => setForm({ ...form, deliveryInstruction: e.target.value })} />

          <label style={styles.label}>Transport</label>
          <input style={styles.input} value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />

          <label style={styles.label}>Packing Instruction</label>
          <input style={styles.input} value={form.packingInstruction} onChange={(e) => setForm({ ...form, packingInstruction: e.target.value })} />

          <label style={styles.label}>Remark</label>
          <textarea style={{ ...styles.input, minHeight: 60 }} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />

          <button style={styles.btn} disabled={!canSubmit} onClick={submit}>
            {editingId ? "Save Changes" : "Save Indent"}
          </button>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <select style={{ ...styles.input, marginBottom: 0, width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="partial_dispatch">Partial Dispatch</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

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
                  <td style={styles.td}>{indent.quantity} {indent.unit}</td>
                  <td style={styles.td}>{dispatched} {indent.unit}</td>
                  <td style={styles.td}>{pending} {indent.unit}</td>
                  <td style={styles.td}><span style={styles.badge(bg, fg)}>{indent.status}</span></td>
                  <td style={styles.td}>
                    <button style={{ ...styles.btnGhost, padding: "4px 8px", fontSize: 11 }} onClick={() => setExpandedId(expandedId === indent.id ? null : indent.id)}>
                      {expandedId === indent.id ? "Hide" : "Details"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleIndents.length === 0 && (
              <tr><td style={styles.td} colSpan={9}>No indents found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {visibleIndents.filter((i) => i.id === expandedId).map((indent) => (
        <div key={indent.id} style={styles.listItem}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong>{indent.indentNumber}</strong> — {millName(indent.millId)}
          </div>
          <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
            {indent.shade && <div>Shade/Dyeing: {indent.shade}</div>}
            {indent.orderIn === "rolls" && <div>Ordered as: {indent.rolls} rolls ({ROLL_LENGTH_METERS}m each)</div>}
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
            addDispatch={addDispatch}
            updateDispatch={updateDispatch}
            deleteDispatch={deleteDispatch}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button style={styles.btnWhatsapp} onClick={() => shareIndent(indent, getBuyer(indent.buyerId), getMill(indent.millId))}>
              Share (WA)
            </button>
            <button style={styles.btnPdf} onClick={() => exportIndentPDF(indent)}>
              Export PDF
            </button>
            {indent.status !== "closed" && indent.status !== "cancelled" && (
              <button style={styles.btnGhost} onClick={() => closeIndent(indent)}>Close Indent</button>
            )}
            <button style={styles.btnGhost} onClick={() => startEdit(indent)}>Edit</button>
            <button style={styles.btnDanger} onClick={() => handleDeleteIndent(indent)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Dispatch sub-section ---------- */
function DispatchSection({ indent, addDispatch, updateDispatch, deleteDispatch }) {
  const [showForm, setShowForm] = useState(false);
  const [editingDispatchId, setEditingDispatchId] = useState(null);

  const emptyDispatchForm = {
    date: todayISO(),
    orderIn: "meters",
    rolls: "",
    qty: "",
    freight: "",
    invoiceNumber: "",
    invoiceDate: todayISO(),
    lrNumber: "",
    lrDate: todayISO(),
    transporter: "",
  };

  const [form, setForm] = useState(emptyDispatchForm);

  const dispatches = indent.dispatches || [];
  const totalDispatched = totalDispatchedQty(indent);
  const ordered = Number(indent.quantity) || 0;
  const remaining = Math.max(ordered - totalDispatched, 0);

  const canSubmit = form.qty && Number(form.qty) > 0;

  // Inline Financial Calculation for Preview
  const previewTaxableValue = roundRupee((Number(form.qty) || 0) * (Number(indent.rate) || 0));
  const previewFreight = Number(form.freight) || 0;
  const previewGst = (previewTaxableValue + previewFreight) * 0.05;
  const previewExactTotal = previewTaxableValue + previewFreight + previewGst;
  const previewGrandTotal = Math.round(previewExactTotal);
  const previewRoundOff = previewGrandTotal - previewExactTotal;

  function startEditDispatch(d) {
    setForm({
      date: d.date,
      orderIn: d.orderIn || "meters",
      rolls: d.rolls || "",
      qty: d.qty,
      freight: d.freight || "",
      invoiceNumber: d.invoiceNumber || "",
      invoiceDate: d.invoiceDate || todayISO(),
      lrNumber: d.lrNumber || "",
      lrDate: d.lrDate || todayISO(),
      transporter: d.transporter || "",
    });
    setEditingDispatchId(d.id);
    setShowForm(true);
  }

  function submit() {
    if (!canSubmit) return;
    const payload = { ...form, qty: Number(form.qty), freight: Number(form.freight) || 0 };
    if (editingDispatchId) {
      updateDispatch(indent.id, editingDispatchId, payload);
    } else {
      addDispatch(indent.id, payload);
    }
    setForm(emptyDispatchForm);
    setEditingDispatchId(null);
    setShowForm(false);
  }

  function handleDelete(d) {
    const ok = window.confirm(`⚠️ Delete this dispatch entry (${d.qty} ${indent.unit} on ${d.date})? This cannot be undone.`);
    if (ok) deleteDispatch(indent.id, d.id);
  }

  return (
    <div style={{ borderTop: `1px dashed ${colors.border}`, marginTop: 10, paddingTop: 10 }}>
      <div style={{ ...styles.sectionHeader, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          Dispatch: {totalDispatched} / {ordered} {indent.unit}
          {remaining > 0 && <span style={{ color: colors.textMuted, fontWeight: 500 }}> · {remaining} {indent.unit} remaining</span>}
        </div>
        <button
          style={styles.btnGhost}
          onClick={() => {
            if (showForm) {
              setForm(emptyDispatchForm);
              setEditingDispatchId(null);
            }
            setShowForm((s) => !s);
          }}
        >
          {showForm ? "Cancel" : "+ Add Dispatch"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...styles.card, padding: 12, marginBottom: 10 }}>
          {editingDispatchId && <div style={{ fontSize: 12, color: colors.mustard, marginBottom: 8, fontWeight: 700 }}>Editing Dispatch Entry</div>}
          
          <label style={styles.label}>Dispatch In</label>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" checked={form.orderIn === "meters"} onChange={() => setForm({ ...form, orderIn: "meters" })} />
              Direct Quantity
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" checked={form.orderIn === "rolls"} onChange={() => setForm({ ...form, orderIn: "rolls" })} />
              No. of Rolls ({ROLL_LENGTH_METERS}m/roll)
            </label>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Dispatch Date</label>
              <input style={styles.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            {form.orderIn === "rolls" ? (
              <div>
                <label style={styles.label}>No. of Rolls *</label>
                <input
                  style={styles.input}
                  type="number"
                  value={form.rolls}
                  onChange={(e) => {
                    const rolls = e.target.value;
                    setForm({ ...form, rolls, qty: rolls ? Number(rolls) * ROLL_LENGTH_METERS : "" });
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={styles.label}>Quantity Dispatched *</label>
                <input style={styles.input} type="number" placeholder={`out of ${remaining} remaining`} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              </div>
            )}
          </div>

          {form.orderIn === "rolls" && (
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
              Quantity (auto): {form.qty || 0} {indent.unit}
            </div>
          )}

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Taxable Value (auto)</label>
              <input style={{ ...styles.input, background: colors.bg }} value={formatINR(previewTaxableValue)} readOnly />
            </div>
            <div>
              <label style={styles.label}>Freight (₹)</label>
              <input style={styles.input} type="number" placeholder="0" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} />
            </div>
          </div>

          <div style={{ ...styles.card, padding: 10, marginBottom: 12, background: colors.bg }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span>GST @ 5% (on Value + Freight)</span> <strong>{formatINR(previewGst)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span>Round Off (auto)</span> <strong>{previewRoundOff >= 0 ? "+" : ""}{previewRoundOff.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: `1px solid ${colors.border}`, paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>Grand Total</span> <strong style={{ color: colors.primary }}>{formatINR(previewGrandTotal)}</strong>
            </div>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Mill Invoice Number</label>
              <input style={styles.input} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Invoice Date</label>
              <input style={styles.input} type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </div>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>LR Number</label>
              <input style={styles.input} placeholder="Lorry Receipt No." value={form.lrNumber} onChange={(e) => setForm({ ...form, lrNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>LR Date</label>
              <input style={styles.input} type="date" value={form.lrDate} onChange={(e