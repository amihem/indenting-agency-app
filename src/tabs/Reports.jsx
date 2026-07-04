// src/tabs/Reports.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { indentValue, commissionForIndents } from "../lib/calc";
import { printReport } from "../lib/print";

function groupSum(list, keyFn, valueFn) {
  const map = {};
  list.forEach((item) => {
    const key = keyFn(item);
    map[key] = (map[key] || 0) + valueFn(item);
  });
  return map;
}

function ReportTable({ title, rows, columns, onExport }) {
  return (
    <div style={styles.card}>
      <div style={styles.sectionHeader}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        <button style={styles.btnPdf} onClick={onExport}>
          Export PDF
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th style={styles.th} key={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, i) => (
                  <td style={styles.td} key={i}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={columns.length}>
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportTable(title, columns, rows) {
  const html = `
    <h2>${title}</h2>
    <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
    <table>
      <thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
  printReport(title, html);
}

export default function ReportsTab({ data }) {
  const [section, setSection] = useState("sales");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  /* ---------- Sales reports ---------- */
  const salesByBuyer = groupSum(data.indents, (i) => buyerName(i.buyerId), indentValue);
  const salesByProduct = groupSum(data.indents, (i) => i.productName || "—", indentValue);
  const salesByMill = groupSum(data.indents, (i) => millName(i.millId), indentValue);

  /* ---------- Commission reports (FIFO realized/accrued) ---------- */
  const allocations = commissionForIndents(data.indents, data.buyers, data.collections);

  const commissionByBuyer = {};
  allocations.forEach((a) => {
    const name = buyerName(a.indent.buyerId);
    if (!commissionByBuyer[name]) commissionByBuyer[name] = { realized: 0, accrued: 0 };
    commissionByBuyer[name].realized += a.commissionRealized;
    commissionByBuyer[name].accrued += a.commissionAccrued;
  });

  const commissionByMill = {};
  allocations.forEach((a) => {
    const name = millName(a.indent.millId);
    if (!commissionByMill[name]) commissionByMill[name] = { realized: 0, accrued: 0 };
    commissionByMill[name].realized += a.commissionRealized;
    commissionByMill[name].accrued += a.commissionAccrued;
  });

  /* ---------- Collection by buyer ---------- */
  const collectionByBuyer = groupSum(data.collections, (c) => buyerName(c.buyerId), (c) => Number(c.amount) || 0);

  const sections = [
    ["sales", "Sales Report"],
    ["commission", "Commission Report"],
    ["collection", "Collection Report"],
  ];

  return (
    <div>
      <div style={styles.h2}>Reports</div>
      <div style={{ display: "flex", gap: 6, margin: "10px 0 16px" }}>
        {sections.map(([key, label]) => (
          <button
            key={key}
            style={{
              background: section === key ? colors.indigo : "#fff",
              color: section === key ? "#fff" : colors.textMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "sales" && (
        <>
          <ReportTable
            title="Sales — Customer-wise"
            columns={["Buyer", "Total Sales"]}
            rows={Object.entries(salesByBuyer).map(([name, val]) => [name, formatINR(val)])}
            onExport={() =>
              exportTable(
                "Sales Report — Customer-wise",
                ["Buyer", "Total Sales"],
                Object.entries(salesByBuyer).map(([name, val]) => [name, formatINR(val)])
              )
            }
          />
          <ReportTable
            title="Sales — Product-wise"
            columns={["Product", "Total Sales"]}
            rows={Object.entries(salesByProduct).map(([name, val]) => [name, formatINR(val)])}
            onExport={() =>
              exportTable(
                "Sales Report — Product-wise",
                ["Product", "Total Sales"],
                Object.entries(salesByProduct).map(([name, val]) => [name, formatINR(val)])
              )
            }
          />
          <ReportTable
            title="Sales — Supplier (Mill) wise"
            columns={["Mill", "Total Sales"]}
            rows={Object.entries(salesByMill).map(([name, val]) => [name, formatINR(val)])}
            onExport={() =>
              exportTable(
                "Sales Report — Supplier-wise",
                ["Mill", "Total Sales"],
                Object.entries(salesByMill).map(([name, val]) => [name, formatINR(val)])
              )
            }
          />
        </>
      )}

      {section === "commission" && (
        <>
          <ReportTable
            title="Commission — Customer-wise"
            columns={["Buyer", "Realized", "Accrued (Pending)", "Total"]}
            rows={Object.entries(commissionByBuyer).map(([name, v]) => [
              name,
              formatINR(v.realized),
              formatINR(v.accrued),
              formatINR(v.realized + v.accrued),
            ])}
            onExport={() =>
              exportTable(
                "Commission Report — Customer-wise",
                ["Buyer", "Realized", "Accrued", "Total"],
                Object.entries(commissionByBuyer).map(([name, v]) => [
                  name,
                  formatINR(v.realized),
                  formatINR(v.accrued),
                  formatINR(v.realized + v.accrued),
                ])
              )
            }
          />
          <ReportTable
            title="Commission — Supplier (Mill) wise"
            columns={["Mill", "Realized", "Accrued (Pending)", "Total"]}
            rows={Object.entries(commissionByMill).map(([name, v]) => [
              name,
              formatINR(v.realized),
              formatINR(v.accrued),
              formatINR(v.realized + v.accrued),
            ])}
            onExport={() =>
              exportTable(
                "Commission Report — Supplier-wise",
                ["Mill", "Realized", "Accrued", "Total"],
                Object.entries(commissionByMill).map(([name, v]) => [
                  name,
                  formatINR(v.realized),
                  formatINR(v.accrued),
                  formatINR(v.realized + v.accrued),
                ])
              )
            }
          />
        </>
      )}

      {section === "collection" && (
        <ReportTable
          title="Collection — Customer-wise"
          columns={["Buyer", "Total Collected"]}
          rows={Object.entries(collectionByBuyer).map(([name, val]) => [name, formatINR(val)])}
          onExport={() =>
            exportTable(
              "Collection Report — Customer-wise",
              ["Buyer", "Total Collected"],
              Object.entries(collectionByBuyer).map(([name, val]) => [name, formatINR(val)])
            )
          }
        />
      )}
    </div>
  );
}
