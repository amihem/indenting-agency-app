// src/tabs/Products.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { calcGsmAndOz } from "../lib/textile";

export default function ProductsTab({ items, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "meters",
    commercialNo: "",
    dying: "",
    type: "",
    weightGLM: "",
    width: "",
    finish: "",
    packing: "",
  });

  const { gsm, oz } = calcGsmAndOz(form.weightGLM, form.width);
  const canSubmit = form.name.trim() !== "";

  function submit() {
    if (!canSubmit) return;
    onAdd({ ...form, gsm, oz });
    setForm({
      name: "",
      unit: "meters",
      commercialNo: "",
      dying: "",
      type: "",
      weightGLM: "",
      width: "",
      finish: "",
      packing: "",
    });
    setShowForm(false);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Products</div>
        <button style={styles.btn} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <div style={styles.card}>
          <label style={styles.label}>Product / Quality Name *</label>
          <input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Unit</label>
              <select style={styles.input} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="meters">Meters</option>
                <option value="kg">Kg</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Commercial No.</label>
              <input
                style={styles.input}
                value={form.commercialNo}
                onChange={(e) => setForm({ ...form, commercialNo: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Dying</label>
              <input style={styles.input} value={form.dying} onChange={(e) => setForm({ ...form, dying: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Type</label>
              <input style={styles.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Weight (GLM — grams/linear meter)</label>
              <input
                style={styles.input}
                type="number"
                value={form.weightGLM}
                onChange={(e) => setForm({ ...form, weightGLM: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Width (inches)</label>
              <input style={styles.input} type="number" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} />
            </div>
          </div>

          <div style={{ ...styles.card, background: colors.bg, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
              Auto-calculated from GLM &amp; Width:
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              GSM: {gsm || 0} · OZ: {oz || 0}
            </div>
          </div>

          <div style={styles.row2}>
            <div>
              <label style={styles.label}>Finish</label>
              <input style={styles.input} value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Packing</label>
              <input style={styles.input} value={form.packing} onChange={(e) => setForm({ ...form, packing: e.target.value })} />
            </div>
          </div>

          <button style={styles.btn} disabled={!canSubmit} onClick={submit}>
            Save Product
          </button>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          No products added yet.
        </div>
      )}

      {items.map((p) => (
        <div key={p.id} style={{ ...styles.listItem, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{p.name}</strong>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              {[
                p.commercialNo && `Comm No: ${p.commercialNo}`,
                p.type && `Type: ${p.type}`,
                p.dying && `Dying: ${p.dying}`,
                p.width && `Width: ${p.width}"`,
                p.weightGLM && `GLM: ${p.weightGLM}`,
                p.gsm && `GSM: ${p.gsm}`,
                p.oz && `OZ: ${p.oz}`,
                p.finish && `Finish: ${p.finish}`,
                p.packing && `Packing: ${p.packing}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <button style={styles.btnDanger} onClick={() => onDelete(p.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
