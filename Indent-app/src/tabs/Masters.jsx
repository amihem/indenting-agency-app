// src/tabs/Masters.jsx
// Combines Mills, Buyers, and Products into one "Masters" tab with sub-tabs,
// matching the request to reduce top-level tab clutter.
import React, { useState } from "react";
import { styles, colors } from "../styles";
import ProductsTab from "./Products";

export default function MastersTab({ data, addMill, updateMill, deleteMill, addBuyer, updateBuyer, deleteBuyer, addProduct, updateProduct, deleteProduct }) {
  const [subTab, setSubTab] = useState("mills");

  return (
    <div>
      <div style={styles.h2}>Masters</div>
      <div style={{ display: "flex", gap: 6, margin: "10px 0 16px" }}>
        {[
          ["mills", "Mills / Suppliers"],
          ["buyers", "Buyers"],
          ["products", "Products"],
        ].map(([key, label]) => (
          <button
            key={key}
            style={{
              background: subTab === key ? colors.indigo : "#fff",
              color: subTab === key ? "#fff" : colors.textMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setSubTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "mills" && (
        <EntityMasterSection
          title="Mills / Suppliers"
          items={data.mills}
          onAdd={addMill}
          onUpdate={updateMill}
          onDelete={deleteMill}
          fields={[
            { key: "name", label: "Mill Name", required: true },
            { key: "phone", label: "Phone (with country code, e.g. 91...)" },
            { key: "address", label: "Full Address" },
            { key: "gst", label: "GST Number" },
            { key: "commissionPct", label: "Default Commission %", type: "number" },
            { key: "paymentTerms", label: "Payment Terms" },
          ]}
        />
      )}

      {subTab === "buyers" && (
        <EntityMasterSection
          title="Buyers"
          items={data.buyers}
          onAdd={addBuyer}
          onUpdate={updateBuyer}
          onDelete={deleteBuyer}
          fields={[
            { key: "name", label: "Business Name", required: true },
            { key: "phone", label: "Phone (with country code, e.g. 91...)" },
            { key: "address", label: "Full Address" },
            { key: "gst", label: "GST Number" },
            { key: "creditDays", label: "Credit Days", type: "number" },
          ]}
        />
      )}

      {subTab === "products" && (
        <ProductsTab items={data.products} onAdd={addProduct} onUpdate={updateProduct} onDelete={deleteProduct} />
      )}
    </div>
  );
}

/* ---------------- Generic master list with Add / Edit / warning-confirmed Delete ---------------- */
function EntityMasterSection({ title, items, onAdd, onUpdate, onDelete, fields }) {
  const initial = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [form, setForm] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const requiredOk = fields.filter((f) => f.required).every((f) => form[f.key] && form[f.key].toString().trim() !== "");

  function startEdit(item) {
    setForm(Object.fromEntries(fields.map((f) => [f.key, item[f.key] ?? ""])));
    setEditingId(item.id);
    setShowForm(true);
  }

  function submit() {
    if (!requiredOk) return;
    if (editingId) {
      onUpdate(editingId, form);
    } else {
      onAdd(form);
    }
    setForm(initial);
    setEditingId(null);
    setShowForm(false);
  }

  function cancelForm() {
    setForm(initial);
    setEditingId(null);
    setShowForm(false);
  }

  function handleDelete(item) {
    const ok = window.confirm(`⚠️ Delete "${item.name}" permanently? This cannot be undone.`);
    if (ok) onDelete(item.id);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        <button style={styles.btn} onClick={() => (showForm ? cancelForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <div style={styles.card}>
          {editingId && <div style={{ fontSize: 12, color: colors.mustard, marginBottom: 8, fontWeight: 700 }}>Editing</div>}
          {fields.map((f) => (
            <div key={f.key}>
              <label style={styles.label}>
                {f.label} {f.required && "*"}
              </label>
              <input
                style={styles.input}
                type={f.type || "text"}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
          <button style={styles.btn} disabled={!requiredOk} onClick={submit}>
            {editingId ? "Save Changes" : "Save"}
          </button>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          None added yet.
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} style={{ ...styles.listItem, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{item.name}</strong>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              {fields
                .filter((f) => f.key !== "name" && item[f.key])
                .map((f) => `${f.label}: ${item[f.key]}`)
                .join(" · ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...styles.btnGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(item)}>
              Edit
            </button>
            <button style={styles.btnDanger} onClick={() => handleDelete(item)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
