// src/lib/fy.js
// Indian Financial Year runs April → March.
// FY23-24 means 1-Apr-2023 to 31-Mar-2024.

export function getFY(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 4) {
    return `FY${String(year).slice(2)}-${String(year + 1).slice(2)}`;
  }
  return `FY${String(year - 1).slice(2)}-${String(year).slice(2)}`;
}

// Collects every distinct FY present across one or more arrays of records,
// given a function that extracts the relevant date from each record.
// Returns FYs sorted oldest → newest, e.g. ["FY23-24", "FY24-25", "FY25-26"].
export function collectFYs(recordArraysWithDateFn) {
  const set = new Set();
  recordArraysWithDateFn.forEach(([records, dateFn]) => {
    (records || []).forEach((r) => {
      const fy = getFY(dateFn(r));
      if (fy) set.add(fy);
    });
  });
  return Array.from(set).sort();
}

export function matchesFY(dateStr, fy) {
  if (!fy) return true; // "All" / no filter selected
  return getFY(dateStr) === fy;
}

// "FY23-24" -> { from: "2023-04-01", to: "2024-03-31" }
export function getFYDateRange(fy) {
  const m = /^FY(\d{2})-(\d{2})$/.exec(fy || "");
  if (!m) return null;
  const startYear = 2000 + Number(m[1]);
  const endYear = 2000 + Number(m[2]);
  return { from: `${startYear}-04-01`, to: `${endYear}-03-31` };
}

/* ---------- Reusable FY <select> dropdown, styled like the app's other filters ---------- */
import React from "react";
import { styles } from "../styles";

export function FYSelect({ value, onChange, fys, style }) {
  return (
    <select style={{ ...styles.input, ...style }} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All Years</option>
      {fys.map((fy) => (
        <option key={fy} value={fy}>
          {fy}
        </option>
      ))}
    </select>
  );
}
