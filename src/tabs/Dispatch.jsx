// src/tabs/Dispatch.jsx
import React, { useState, useMemo } from "react";
import { styles, colors } from "../styles";
import { formatDate, formatINR, todayISO, ROLL_LENGTH_METERS } from "../lib/storage";
import { computeInvoices, pendingQty } from "../lib/calc";
import { printReport } from "../lib/print";
import { getFY, collectFYs, matchesFY, FYSelect } from "../lib/fy.jsx";
import SearchableSelect from "../components/SearchableSelect";

export default function DispatchTab({ data, addDispatch, updateDispatch, deleteDispatch }) {
  const [buyerFilter, setBuyerFilter] = useState("");
  const [millFilter, setMillFilter] = useState("");
  const [fyFilter, setFyFilter] = useState("");
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  const allInvoices = useMemo(() => computeInvoices(data.indents, data.mills), [data.indents, data.mills]);
  const availableFYs = collectFYs([[allInvoices, (i) => i.invoiceDate]]);
  const mismatchCount = allInvoices.filter((i) => i.hasActual && Math.abs(i.variance) > 0.5).length;

  const rows = allInvoices
    .filter((inv) => !buyerFilter || inv.buyerId === buyerFilter)
    .filter((inv) => !millFilter || inv.millId === millFilter)
    .filter((inv) => matchesFY(inv.invoiceDate, fyFilter))
    .filter((inv) => !mismatchOnly || (inv.hasActual && Math.abs(inv.variance) > 0.5))
    .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));

  function exportPDF() {
    const tableRows = rows
      .map(
        (r) => `
      <tr>
        <td>${r.indentNumber}</td><td>${buyerName(r.buyerId)}</td><td>${millName(r.millId)}</td><td>${r.invoiceNo || "—"}</td>
        <td>${r.qty}</td><td>${formatINR(r.rate)}</td><td>${formatINR(r.unitValue)}</td>
        <td>${formatINR(r.freight)}</td><td>${formatINR(r.gstAmount)}</td><td>${r.roundOff.toFixed(2)}</td>
        <td><strong>${formatINR(r.value)}</strong></td><td>${r.hasActual ? formatINR(r.variance) : "—"}</td>
      </tr>`
      )
      .join("");
    const totalVal = rows.reduce((s, r) => s + r.value, 0);
    const html = `<table><thead><tr><th>Indent No</th><th>Buyer</th><th>Mill</th><th>Mill Inv</th><th>Qty</th><th>Rate</th><th>Base Val</th><th>Freight</th><th>GST (5%)</th><th>R/Off</th><th>Total Val</th><th>Variance</th></tr></thead><tbody>${tableRows}</tbody></table><p style="margin-top:14px"><strong>Total Invoice Value: ${formatINR(totalVal)}</strong> (${rows.length} dispatches)</p>`;
    printReport("Dispatch Register", html, buyerFilter || millFilter || fyFilter ? "Filtered view" : "All dispatches");
  }

  function handleDelete(r) {
    const ok = window.confirm(`⚠️ Delete this dispatch (${r.qty} ${r.unit} — Indent ${r.indentNumber})? This cannot be undone.`);
    if (ok) deleteDispatch(r.indentId, r.dispatchId);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Dispatch Tracking</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btn} onClick={() => setShowAddForm((s) => !s)}>
            {showAddForm ? "Cancel" : "+ Add Dispatch"}
          </button>
          <button style={styles.btnPdf} onClick={exportPDF}>
            Export PDF
          </button>
        </div>
      </div>

      {showAddForm && (
        <QuickAddDispatch data={data} addDispatch={addDispatch} onDone={() => setShowAddForm(false)} />
      )}

      <div style={styles.row3}>
        <div>
          <label style={styles.label}>Customer (Buyer)</label>
          <SearchableSelect
            value={buyerFilter}
            onChange={setBuyerFilter}
            options={data.buyers.map((b) => ({ id: b.id, label: b.name }))}
            placeholder="All buyers"
          />
        </div>
        <div>
          <label style={styles.label}>Mill</label>
          <SearchableSelect
            value={millFilter}
            onChange={setMillFilter}
            options={data.mills.map((m) => ({ id: m.id, label: m.name }))}
            placeholder="All mills"
          />
        </div>
        <div>
          <label style={styles.label}>Financial Year</label>
          <FYSelect value={fyFilter} onChange={setFyFilter} fys={availableFYs} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
        Showing {rows.length} of {allInvoices.length} dispatch entries.
        {millFilter && ` Filtered to: ${millName(millFilter)}.`}
      </div>

      {mismatchCount > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, color: colors.danger, fontWeight: 700 }}>
          <input type="checkbox" checked={mismatchOnly} onChange={(e) => setMismatchOnly(e.target.checked)} />
          Show only mismatches ({mismatchCount} dispatch{mismatchCount > 1 ? "es" : ""} where actual invoice ≠ calculated)
        </label>
      )}

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Indent</th>
              <th style={styles.th}>Buyer</th>
              <th style={styles.th}>Mill</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Rate</th>
              <th style={styles.th}>Base Val</th>
              <th style={styles.th}>Freight</th>
              <th style={styles.th}>GST(5%)</th>
              <th style={styles.th}>R/Off</th>
              <th style={styles.th}>Inv Val</th>
              <th style={styles.th}>Variance</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              editingKey === r.key ? (
                <EditRow
                  key={r.key}
                  row={r}
                  colSpan={13}
                  onCancel={() => setEditingKey(null)}
                  onSave={(changes) => {
                    updateDispatch(r.indentId, r.dispatchId, changes);
                    setEditingKey(null);
                  }}
                />
              ) : (
                <tr key={r.key} style={r.hasActual && Math.abs(r.variance) > 0.5 ? { background: "#FEF2F2" } : undefined}>
                  <td style={styles.td}>{formatDate(r.invoiceDate)}</td>
                  <td style={styles.td}>{r.indentNumber}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{buyerName(r.buyerId)}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{millName(r.millId)}</td>
                  <td style={styles.td}>
                    {r.qty} {r.unit}
                  </td>
                  <td style={styles.td}>{r.rate}</td>
                  <td style={styles.td}>{formatINR(r.unitValue)}</td>
                  <td style={styles.td}>{formatINR(r.freight)}</td>
                  <td style={styles.td}>{formatINR(r.gstAmount)}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: colors.textMuted }}>{r.roundOff.toFixed(2)}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>
                    {formatINR(r.value)}
                    {r.hasActual && <div style={{ fontSize: 10, color: colors.textMuted, fontWeight: 400 }}>(actual)</div>}
                  </td>
                  <td style={styles.td}>
                    {r.hasActual ? (
                      <span style={{ color: Math.abs(r.variance) > 0.5 ? colors.danger : colors.success, fontWeight: 700 }}>
                        {r.variance > 0 ? "+" : ""}
                        {formatINR(r.variance)}
                      </span>
                    ) : (
                      <span style={{ color: colors.textMuted }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...styles.btnGhost, padding: "4px 8px", fontSize: 11 }} onClick={() => setEditingKey(r.key)}>
                        Edit
                      </button>
                      <button style={{ ...styles.btnDanger, padding: "4px 8px", fontSize: 11 }} onClick={() => handleDelete(r)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {rows.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={13}>
                  No dispatch entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Inline edit row ---------- */
function EditRow({ row, onSave, onCancel, colSpan }) {
  const [form, setForm] = useState({
    qty: row.qty,
    date: row.dispatchDate || todayISO(),
    invoiceNumber: row.invoiceNo || "",
    invoiceDate: row.invoiceDate || todayISO(),
    lrNumber: row.lrNo || "",
    lrDate: row.lrDate || todayISO(),
    transporter: row.transporter || "",
    freight: row.freight || 0,
    actualInvoiceValue: row.actualValue ?? "",
  });

  function save() {
    onSave({ ...form, qty: Number(form.qty), freight: Number(form.freight) || 0 });
  }

  return (
    <tr>
      <td style={styles.td} colSpan={colSpan}>
        <div style={{ ...styles.card, margin: 0, background: colors.bg }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: colors.mustard }}>
            Editing Dispatch — Indent {row.indentNumber}
          </div>
          <div style={styles.row3}>
            <div>
              <label style={styles.label}>Qty ({row.unit})</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Dispatch Date</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Freight (₹)</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="number" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={styles.label}>Actual Mill Invoice Amount (optional — overrides calculated total)</label>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              type="number"
              placeholder="Leave blank to use calculated total"
              value={form.actualInvoiceValue}
              onChange={(e) => setForm({ ...form, actualInvoiceValue: e.target.value })}
            />
          </div>
          <div style={styles.row3}>
            <div>
              <label style={styles.label}>Mill Invoice No</label>
              <input style={{ ...styles.input, marginBottom: 8 }} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Invoice Date</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Transporter</label>
              <input style={{ ...styles.input, marginBottom: 8 }} value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} />
            </div>
          </div>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>LR No</label>
              <input style={{ ...styles.input, marginBottom: 8 }} value={form.lrNumber} onChange={(e) => setForm({ ...form, lrNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>LR Date</label>
              <input style={{ ...styles.input, marginBottom: 8 }} type="date" value={form.lrDate} onChange={(e) => setForm({ ...form, lrDate: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={styles.btn} onClick={save}>
              Save Changes
            </button>
            <button style={styles.btnGhost} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ---------------- Quick Add Dispatch — Buyer first, then only their pending Indents ---------------- */
function QuickAddDispatch({ data, addDispatch, onDone }) {
  const [buyerId, setBuyerId] = useState("");
  const [indentId, setIndentId] = useState("");
  const [orderIn, setOrderIn] = useState("meters");
  const [form, setForm] = useState({
    date: todayISO(),
    rolls: "",
    qty: "",
    invoiceNumber: "",
    invoiceDate: todayISO(),
    lrNumber: "",
    lrDate: todayISO(),
    transporter: "",
    freight: "",
    actualInvoiceValue: "",
  });

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const millName = (id) => data.mills.find((m) => m.id === id)?.name || "—";

  // Only pending indents (not fulfilled/cancelled/closed, and still has qty left)
  // for the selected buyer — this is the whole point: no more hunting through
  // the full Indent list.
  const pendingIndentsForBuyer = data.indents.filter(
    (i) =>
      i.buyerId === buyerId &&
      !["fulfilled", "cancelled", "closed"].includes(i.status) &&
      pendingQty(i) > 0
  );

  const selectedIndent = data.indents.find((i) => i.id === indentId);
  const remaining = selectedIndent ? pendingQty(selectedIndent) : 0;

  const previewQty = Number(form.qty) || 0;
  const previewUnitValue = Math.round(previewQty * (Number(selectedIndent?.rate) || 0));
  const previewFreight = Number(form.freight) || 0;
  const previewGstBase = previewUnitValue + previewFreight;
  const previewGst = Math.round(previewGstBase * 0.05 * 100) / 100;
  const previewSubtotal = previewUnitValue + previewFreight + previewGst;
  const previewInvoiceTotal = Math.round(previewSubtotal);
  const previewRoundOff = Math.round((previewInvoiceTotal - previewSubtotal) * 100) / 100;
  const previewActual = form.actualInvoiceValue !== "" ? Math.round(Number(form.actualInvoiceValue)) : null;
  const previewVariance = previewActual != null ? previewActual - previewInvoiceTotal : 0;

  const canSubmit = indentId && form.qty && Number(form.qty) > 0;

  function submit() {
    if (!canSubmit) return;
    addDispatch(indentId, { ...form, orderIn, qty: Number(form.qty), freight: Number(form.freight) || 0 });
    onDone();
  }

  return (
    <div style={{ ...styles.card, borderColor: colors.indigo }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Add Dispatch</div>

      <label style={styles.label}>Step 1 — Select Buyer *</label>
      <SearchableSelect
        value={buyerId}
        onChange={(id) => {
          setBuyerId(id);
          setIndentId("");
        }}
        options={data.buyers.map((b) => ({ id: b.id, label: b.name, sublabel: b.phone }))}
        placeholder="Select buyer"
      />

      {buyerId && (
        <>
          <label style={styles.label}>Step 2 — Select Pending Indent *</label>
          {pendingIndentsForBuyer.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              No pending indents for {buyerName(buyerId)} — everything is already dispatched, closed, or cancelled.
            </div>
          ) : (
            <SearchableSelect
              value={indentId}
              onChange={setIndentId}
              options={pendingIndentsForBuyer.map((i) => ({
                id: i.id,
                label: `${i.indentNumber} · ${i.productName}`,
                sublabel: `${millName(i.millId)} · ${pendingQty(i)} ${i.unit} pending`,
              }))}
              placeholder={`Select indent (${pendingIndentsForBuyer.length} pending)`}
            />
          )}
        </>
      )}

      {selectedIndent && (
        <>
          <div style={{ ...styles.card, background: colors.bg, fontSize: 13, marginBottom: 12 }}>
            <strong>{selectedIndent.indentNumber}</strong> — {selectedIndent.productName} · Rate: {formatINR(selectedIndent.rate)} ·{" "}
            <span style={{ color: colors.mustard, fontWeight: 700 }}>
              {remaining} {selectedIndent.unit} remaining
            </span>
          </div>

          <label style={styles.label}>Dispatch In</label>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" checked={orderIn === "meters"} onChange={() => setOrderIn("meters")} />
              Direct Quantity
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="radio" checked={orderIn === "rolls"} onChange={() => setOrderIn("rolls")} />
              No. of Rolls ({ROLL_LENGTH_METERS}m/roll)
            </label>
          </div>

          <div style={styles.row3}>
            <div>
              <label style={styles.label}>Dispatch Date</label>
              <input style={styles.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            {orderIn === "rolls" ? (
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
                <input
                  style={styles.input}
                  type="number"
                  placeholder={`out of ${remaining} remaining`}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                />
              </div>
            )}
            <div>
              <label style={styles.label}>Freight (₹)</label>
              <input style={styles.input} type="number" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} />
            </div>
          </div>

          {previewQty > 0 && (
            <div style={{ ...styles.card, background: colors.bg, marginBottom: 12, fontSize: 12 }}>
              <div>Unit Value: {formatINR(previewUnitValue)}</div>
              <div>Freight: {formatINR(previewFreight)}</div>
              <div>GST (5%): {formatINR(previewGst)}</div>
              <div>Round Off (auto): {formatINR(previewRoundOff)}</div>
              <div style={{ fontWeight: 800, marginTop: 4 }}>Calculated Total: {formatINR(previewInvoiceTotal)}</div>
            </div>
          )}

          <label style={styles.label}>Actual Mill Invoice Amount (optional)</label>
          <input
            style={styles.input}
            type="number"
            placeholder="Leave blank to use the calculated total above"
            value={form.actualInvoiceValue}
            onChange={(e) => setForm({ ...form, actualInvoiceValue: e.target.value })}
          />
          {previewActual != null && Math.abs(previewVariance) > 0.5 && (
            <div style={{ fontSize: 12, marginTop: -8, marginBottom: 12, color: previewVariance > 0 ? colors.success : colors.danger, fontWeight: 700 }}>
              Variance vs calculated: {previewVariance > 0 ? "+" : ""}
              {formatINR(previewVariance)}
            </div>
          )}

          <div style={styles.row3}>
            <div>
              <label style={styles.label}>Mill Invoice No</label>
              <input style={styles.input} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Invoice Date</label>
              <input style={styles.input} type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Transporter</label>
              <input style={styles.input} value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} />
            </div>
          </div>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>LR Number</label>
              <input style={styles.input} value={form.lrNumber} onChange={(e) => setForm({ ...form, lrNumber: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>LR Date</label>
              <input style={styles.input} type="date" value={form.lrDate} onChange={(e) => setForm({ ...form, lrDate: e.target.value })} />
            </div>
          </div>

          <button style={styles.btn} disabled={!canSubmit} onClick={submit}>
            Save Dispatch
          </button>
        </>
      )}
    </div>
  );
}
