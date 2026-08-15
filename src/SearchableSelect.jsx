// src/components/SearchableSelect.jsx
// A dropdown you can type into to filter — used everywhere a Buyer, Mill,
// or Product must be picked. Falls back gracefully to "no matches" text
// instead of breaking if the options list is empty.
import React, { useState, useRef, useEffect } from "react";
import { styles, colors } from "../styles";

export default function SearchableSelect({
  value,
  onChange,
  options, // [{ id, label, sublabel? }]
  placeholder = "Select...",
  allowClear = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.trim().toLowerCase()) ||
          (o.sublabel || "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  function pick(opt) {
    onChange(opt ? opt.id : "");
    setOpen(false);
    setQuery("");
  }

  return (
    <div style={styles.searchSelectWrap} ref={wrapRef}>
      <div
        style={{ ...styles.searchSelectInput, display: "flex", justifyContent: "space-between", alignItems: "center" }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ color: selected ? colors.text : "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {allowClear && selected && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
              }}
              style={{ color: colors.textMuted, fontSize: 13, cursor: "pointer" }}
              title="Clear"
            >
              ✕
            </span>
          )}
          <span style={{ fontSize: 10, color: colors.textMuted }}>▼</span>
        </span>
      </div>

      {open && (
        <div style={styles.searchSelectPanel}>
          <div style={{ padding: 8, borderBottom: `1px solid ${colors.border}`, position: "sticky", top: 0, background: "#fff" }}>
            <input
              autoFocus
              type="text"
              placeholder="Type to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box", outline: "none" }}
            />
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 14, fontSize: 13, color: colors.textMuted, textAlign: "center" }}>No matches found.</div>
          )}
          {filtered.map((opt) => (
            <div key={opt.id} style={styles.searchSelectOption(opt.id === value)} onClick={() => pick(opt)}>
              <div style={{ fontWeight: opt.id === value ? 700 : 500 }}>{opt.label}</div>
              {opt.sublabel && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{opt.sublabel}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
