// src/tabs/Reports.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR } from "../lib/storage";
import { computeInvoices, invoiceWithStatus } from "../lib/calc";
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  let invoices = computeInvoices(data.indents, data.mills).map((inv) => invoiceWithStatus(inv, data.collections));
  if (fromDate) invoices = invoices.filter((i) => i.invoiceDate >= fromDate);
  if (toDate) invoices = invoices.filter((i) => i.invoiceDate <= toDate);

  /* ---------- Sales reports (based on dispatched/invoiced value) ---------- */
  const salesByBuyer = groupSum(invoices, (i) => buyerName(i.buyerId), (i) => i.value);
  const salesByProduct = groupSum(invoices, (i) => i.productName || "—", (i) => i.value);
  const salesByMill = groupSum(invoices, (i) => millName(i.millId), (i) => i.value);

  /* ---------- Commission reports ---------- */
  const commissionByBuyer = {};
  invoices.forEach((inv) => {
    const name = buyerName(inv.buyerId);
    if (!commissionByBuyer[name]) commissionByBuyer[name] = { realized: 0, accrued: 0 };
    commissionByBuyer[name].realized += inv.commissionRealized;
    commissionByBuyer[name].accrued += inv.commissionAccrued;
  });

  const commissionByMill = {};
  invoices.forEach((inv) => {
    const name = millName(inv.millId);
    if (!commissionByMill[name]) commissionByMill[name] = { realized: 0, accrued: 0 };
    commissionByMill[name].realized += inv.commissionRealized;
    commissionByMill[name].accrued += inv.commissionAccrued;
  });

  /* ---------- Collection by buyer (respecting date filter on collection date) ---------- */
  let collections = data.collections;
  if (fromDate) collections = collections.filter((c) => c.date >= fromDate);
  if (toDate) collections = collections.filter((c) => c.date <= toDate);
  const collectionByBuyer = groupSum(
    collections,
    (c) => buyerName(c.buyerId),
    (c) => (c.allocations || []).reduce((s, a) => s + (Number(a.amount) || 0) + (Number(a.cdAmount) || 0), 0)
  );

  const sections = [
    ["sales", "Sales Report"],
    ["commission", "Commission Report"],
    ["collection", "Collection Report"],
  ];

  return (
    <div>
      <div style={styles.h2}>Reports</div>

      <div style={styles.row2}>
        <div>
          <label style={styles.label}>From Date</label>
          <input style={styles.input} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label style={styles.label}>To Date</label>
          <input style={styles.input} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

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
            title="Sales — Customer-wise (based on dispatched value)"
            columns={["Buyer", "Total Sales"]}
            rows={Object.entries(salesByBuyer).map(([name, val]) => [name, formatINR(val)])}
            onExport={() =>
              exportTable("Sales Report — Customer-wise", ["Buyer", "Total Sales"], Object.entries(salesByBuyer).map(([n, v]) => [n, formatINR(v)]))
            }
          />
          <ReportTable
            title="Sales — Product-wise"
            columns={["Product", "Total Sales"]}
            rows={Object.entries(salesByProduct).map(([name, val]) => [name, formatINR(val)])}
            onExport={() =>
              exportTable("Sales Report — Product-wise", ["Product", "Total Sales"], Object.entries(salesByProduct).map(([n, v]) => [n, formatINR(v)]))
            }
          />
          <ReportTable
            title="Sales — Supplier (Mill) wise"
            columns={["Mill", "Total Sales"]}
            rows={Object.entries(salesByMill).map(([name, val]) => [name, formatINR(val)])}
            onExport={() =>
              exportTable("Sales Report — Supplier-wise", ["Mill", "Total Sales"], Object.entries(salesByMill).map(([n, v]) => [n, formatINR(v)]))
            }
          />
        </>
      )}

      {section === "commission" && (
        <>
          <ReportTable
            title="Commission — Customer-wise"
            columns={["Buyer", "Realized", "Accrued (Pending)", "Total"]}
            rows={Object.entries(commissionByBuyer).map(([name, v]) => [name, formatINR(v.realized), formatINR(v.accrued), formatINR(v.realized + v.accrued)])}
            onExport={() =>
              exportTable(
                "Commission Report — Customer-wise",
                ["Buyer", "Realized", "Accrued", "Total"],
                Object.entries(commissionByBuyer).map(([n, v]) => [n, formatINR(v.realized), formatINR(v.accrued), formatINR(v.realized + v.accrued)])
              )
            }
          />
          <ReportTable
            title="Commission — Supplier (Mill) wise"
            columns={["Mill", "Realized", "Accrued (Pending)", "Total"]}
            rows={Object.entries(commissionByMill).map(([name, v]) => [name, formatINR(v.realized), formatINR(v.accrued), formatINR(v.realized + v.accrued)])}
            onExport={() =>
              exportTable(
                "Commission Report — Supplier-wise",
                ["Mill", "Realized", "Accrued", "Total"],
                Object.entries(commissionByMill).map(([n, v]) => [n, formatINR(v.realized), formatINR(v.accrued), formatINR(v.realized + v.accrued)])
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
            exportTable("Collection Report — Customer-wise", ["Buyer", "Total Collected"], Object.entries(collectionByBuyer).map(([n, v]) => [n, formatINR(v)]))
          }
        />
      )}
    </div>
  );
}
