// src/tabs/Masters.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";

export default function MastersTab({ title, items, onAdd, onDelete, fields }) {
  const initial = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [form, setForm] = useState(initial);
  const [showForm, setShowForm] = useState(false);

  const requiredOk = fields
    .filter((f) => f.required)
    .every((f) => form[f.key] && form[f.key].toString().trim() !== "");

  function submit() {
    if (!requiredOk) return;
    onAdd(form);
    setForm(initial);
    setShowForm(false);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>{title}</div>
        <button style={styles.btn} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <div style={styles.card}>
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
            Save
          </button>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          None added yet.
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          style={{
            ...styles.listItem,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>{item.name}</strong>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              {fields
                .filter((f) => f.key !== "name" && item[f.key])
                .map((f) => `${f.label}: ${item[f.key]}`)
                .join(" · ")}
            </div>
          </div>
          <button style={styles.btnDanger} onClick={() => onDelete(item.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
