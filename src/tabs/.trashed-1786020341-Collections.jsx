// src/tabs/Collections.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate, todayISO } from "../lib/storage";
import { pendingInvoicesForCollectionEntry, calcCdPct } from "../lib/calc";
import { shareCollection } from "../lib/whatsapp";
import { printReport } from "../lib/print";

export default function CollectionsTab({ data, addCollection, deleteCollection, updateCdPolicy }) {
  const [showForm, setShowForm] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);

  let visible = data.collections;
  if (filterBuyer) visible = visible.filter((c) => c.buyerId === filterBuyer);
  if (filterFrom) visible = visible.filter((c) => c.date >= filterFrom);
  if (filterTo) visible = visible.filter((c) => c.date <= filterTo);
  const sorted = [...visible].sort((a, b) => new Date(b.date) - new Date(a.date));

  const grandTotal = visible.reduce(
    (s, c) => s + (c.allocations || []).reduce((s2, a) => s2 + (Number(a.amount) || 0) + (Number(a.cdAmount) || 0), 0),
    0
  );

  function exportPDF() {
    const rows = sorted
      .map((c) => {
        const total = (c.allocations || []).reduce((s, a) => s + (Number(a.amount) || 0) + (Number(a.cdAmount) || 0), 0);
        const invoices = (c.allocations || []).map((a) => a.invoiceNo || a.indentNumber).join(", ");
        return `<tr><td>${formatDate(c.date)}</td><td>${buyerName(c.buyerId)}</td><td>${c.mode}</td><td>${c.reference || "—"}</td><td>${invoices}</td><td>${formatINR(total)}</td></tr>`;
      })
      .join("");
    const html = `
      <h2>Collection Report</h2>
      <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
      <table>
        <thead><tr><th>Date</th><th>Buyer</th><th>Mode</th><th>Reference</th><th>Against Invoice(s)</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>Grand Total: ${formatINR(grandTotal)}</strong></p>
    `;
    printReport("Collection Report", html);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Collections (Payments Received)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btnGhost} onClick={() => setShowPolicy((s) => !s)}>
            {showPolicy ? "Hide CD Policy" : "CD Policy"}
          </button>
          <button style={styles.btn} onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Record Collection"}
          </button>
        </div>
      </div>

      {showPolicy && <CdPolicyEditor policy={data.settings.cdPolicy} onSave={updateCdPolicy} />}

      {showForm && (
        <CollectionForm data={data} onSave={(c) => { addCollection(c); setShowForm(false); }} />
      )}

      <div style={styles.row3}>
        <div>
          <label style={styles.label}>Buyer</label>
          <select style={styles.input} value={filterBuyer} onChange={(e) => setFilterBuyer(e.target.value)}>
            <option value="">All buyers</option>
            {data.buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={styles.label}>From Date</label>
          <input style={styles.input} type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label style={styles.label}>To Date</label>
          <input style={styles.input} type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
      </div>

      <div style={{ ...styles.card, background: colors.indigo, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Total Collections (filtered)</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{formatINR(grandTotal)}</div>
        </div>
        <button style={styles.btnPdf} onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      {sorted.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          No collections recorded yet.
        </div>
      )}

      {sorted.map((c) => {
        const total = (c.allocations || []).reduce((s, a) => s + (Number(a.amount) || 0) + (Number(a.cdAmount) || 0), 0);
        return (
          <div key={c.id} style={styles.listItem}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{formatINR(total)}</strong> from {buyerName(c.buyerId)}
                <div style={{ fontSize: 12, color: colors.textMuted }}>
                  {formatDate(c.date)} · {c.mode} {c.reference ? `· Ref: ${c.reference}` : ""}
                </div>
              </div>
              <button style={styles.btnDanger} onClick={() => deleteCollection(c.id)}>
                Delete
              </button>
            </div>
            <div style={{ fontSize: 12, marginTop: 8, borderTop: `1px dashed ${colors.border}`, paddingTop: 8 }}>
              {(c.allocations || []).map((a, i) => (
                <div key={i} style={{ padding: "3px 0" }}>
                  Inv {a.invoiceNo || a.indentNumber}: {formatINR(a.amount)}
                  {a.cdAmount > 0.5 ? ` + CD ${a.cdPct}% (${formatINR(a.cdAmount)})` : ""}
                </div>
              ))}
            </div>
            <button
              style={{ ...styles.btnWhatsapp, marginTop: 8 }}
              onClick={() => shareCollection(c, getBuyer(c.buyerId))}
            >
              Share (WA)
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- CD Policy editor ---------------- */
function CdPolicyEditor({ policy, onSave }) {
  const [maxCreditDays, setMaxCreditDays] = useState(policy.maxCreditDays);
  const [tiers, setTiers] = useState(policy.tiers);

  function updateTier(i, key, value) {
    const copy = [...tiers];
    copy[i] = { ...copy[i], [key]: value };
    setTiers(copy);
  }

  function addTier() {
    setTiers([...tiers, { label: "New Tier", minDays: 0, maxDays: 0, pct: 0 }]);
  }

  function removeTier(i) {
    setTiers(tiers.filter((_, idx) => idx !== i));
  }

  function save() {
    onSave({ maxCreditDays: Number(maxCreditDays) || 0, tiers: tiers.map((t) => ({ ...t, minDays: Number(t.minDays), maxDays: Number(t.maxDays), pct: Number(t.pct) })) });
  }

  return (
    <div style={{ ...styles.card, borderColor: colors.mustard }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Cash Discount (CD) Policy</div>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
        Define CD tiers by days-since-invoice. If a payment date falls in a tier's day
        range, that % CD is suggested automatically when recording the collection.
      </div>

      {tiers.map((t, i) => (
        <div key={i} style={{ ...styles.row2, gridTemplateColumns: "2fr 1fr 1fr 1fr auto", alignItems: "end", marginBottom: 8 }}>
          <div>
            <label style={styles.label}>Label</label>
            <input style={{ ...styles.input, marginBottom: 0 }} value={t.label} onChange={(e) => updateTier(i, "label", e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Min Days</label>
            <input style={{ ...styles.input, marginBottom: 0 }} type="number" value={t.minDays} onChange={(e) => updateTier(i, "minDays", e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Max Days</label>
            <input style={{ ...styles.input, marginBottom: 0 }} type="number" value={t.maxDays} onChange={(e) => updateTier(i, "maxDays", e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>CD %</label>
            <input style={{ ...styles.input, marginBottom: 0 }} type="number" value={t.pct} onChange={(e) => updateTier(i, "pct", e.target.value)} />
          </div>
          <button style={styles.btnDanger} onClick={() => removeTier(i)}>
            ✕
          </button>
        </div>
      ))}

      <button style={styles.btnGhost} onClick={addTier}>
        + Add Tier
      </button>

      <div style={{ marginTop: 14 }}>
        <label style={styles.label}>Maximum Credit Period Allowed (days)</label>
        <input
          style={{ ...styles.input, width: 160 }}
          type="number"
          value={maxCreditDays}
          onChange={(e) => setMaxCreditDays(e.target.value)}
        />
      </div>

      <button style={styles.btn} onClick={save}>
        Save CD Policy
      </button>
    </div>
  );
}

/* ---------------- Collection entry form (invoice-based mapping) ---------------- */
function CollectionForm({ data, onSave }) {
  const [buyerId, setBuyerId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState("NEFT");
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState({}); // { invoiceKey: { checked, amount, cdPct } }

  const cdPolicy = data.settings.cdPolicy;
  const cdOptions = [{ label: "No CD (0%)", pct: 0 }, ...cdPolicy.tiers.map((t) => ({ label: `${t.label} — ${t.pct}%`, pct: t.pct }))];

  const pendingInvoices = buyerId
    ? pendingInvoicesForCollectionEntry(buyerId, data.indents, data.mills, data.collections, cdPolicy)
    : [];

  function toggleInvoice(inv) {
    setSelected((s) => {
      const existing = s[inv.key];
      if (existing?.checked) {
        return { ...s, [inv.key]: { ...existing, checked: false } };
      }
      const cdPct = inv.suggestedCdPct || 0;
      const cdAmount = (inv.value * cdPct) / 100;
      return {
        ...s,
        [inv.key]: {
          checked: true,
          invoiceValue: inv.value,
          amount: Math.max(inv.balance - cdAmount, 0),
          cdPct,
          invoiceNo: inv.invoiceNo,
          indentNumber: inv.indentNumber,
          indentId: inv.indentId,
        },
      };
    });
  }

  function updateCdPct(key, pct) {
    setSelected((s) => {
      const item = s[key];
      const invoiceValue = item.invoiceValue;
      const cdAmount = (invoiceValue * Number(pct)) / 100;
      const inv = pendingInvoices.find((i) => i.key === key);
      const newAmount = Math.max((inv?.balance || 0) - cdAmount, 0);
      return { ...s, [key]: { ...item, cdPct: Number(pct), amount: newAmount } };
    });
  }

  function updateAmount(key, amount) {
    setSelected((s) => ({ ...s, [key]: { ...s[key], amount } }));
  }

  const allocations = Object.entries(selected)
    .filter(([, v]) => v.checked)
    .map(([dispatchId, v]) => {
      const amount = Number(v.amount) || 0;
      const cdPct = Number(v.cdPct) || 0;
      const cdAmount = (Number(v.invoiceValue) * cdPct) / 100; // CD is % of the full Marked Invoice Amount, not of the cash amount
      return { dispatchId, indentId: v.indentId, indentNumber: v.indentNumber, invoiceNo: v.invoiceNo, amount, cdPct, cdAmount };
    });

  const totalCash = allocations.reduce((s, a) => s + a.amount, 0);
  const totalCd = allocations.reduce((s, a) => s + a.cdAmount, 0);
  const canSubmit = buyerId && allocations.length > 0 && totalCash + totalCd > 0;

  function submit() {
    if (!canSubmit) return;
    onSave({ buyerId, date, mode, reference, allocations });
  }

  return (
    <div style={styles.card}>
      <div style={styles.row3}>
        <div>
          <label style={styles.label}>Buyer *</label>
          <select style={styles.input} value={buyerId} onChange={(e) => { setBuyerId(e.target.value); setSelected({}); }}>
            <option value="">Select buyer</option>
            {data.buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={styles.label}>Payment Date</label>
          <input style={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label style={styles.label}>Mode</label>
          <select style={styles.input} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option>NEFT</option>
            <option>RTGS</option>
            <option>UPI</option>
            <option>Cheque</option>
            <option>Cash</option>
          </select>
        </div>
      </div>

      <label style={styles.label}>Reference No.</label>
      <input style={styles.input} value={reference} onChange={(e) => setReference(e.target.value)} />

      {buyerId && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, margin: "10px 0" }}>
            Pending Invoices — select which ones this payment covers
          </div>

          {pendingInvoices.length === 0 && (
            <div style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
              No pending invoices for this buyer.
            </div>
          )}

          {pendingInvoices.map((inv) => {
            const sel = selected[inv.key];
            return (
              <div
                key={inv.key}
                style={{
                  border: `1px solid ${sel?.checked ? colors.indigo : colors.border}`,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!sel?.checked} onChange={() => toggleInvoice(inv)} />
                  <span>
                    Inv <strong>{inv.invoiceNo || inv.indentNumber}</strong> · {formatDate(inv.invoiceDate)} · Invoice
                    Value {formatINR(inv.value)} · Balance {formatINR(inv.balance)} · {inv.days} days old
                  </span>
                </label>

                {sel?.checked && (
                  <div style={{ ...styles.row2, marginTop: 8 }}>
                    <div>
                      <label style={styles.label}>CD Option (based on invoice value)</label>
                      <select
                        style={{ ...styles.input, marginBottom: 0 }}
                        value={sel.cdPct}
                        onChange={(e) => updateCdPct(inv.key, e.target.value)}
                      >
                        {cdOptions.map((opt) => (
                          <option key={opt.pct + opt.label} value={opt.pct}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Cash Amount Received (₹)</label>
                      <input
                        style={{ ...styles.input, marginBottom: 0 }}
                        type="number"
                        value={sel.amount}
                        onChange={(e) => updateAmount(inv.key, e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {sel?.checked && Number(sel.cdPct) > 0 && (
                  <div style={{ fontSize: 12, color: colors.success, marginTop: 6 }}>
                    CD Amount: {formatINR((Number(sel.invoiceValue) * Number(sel.cdPct)) / 100)} (on full invoice value)
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {allocations.length > 0 && (
        <div style={{ ...styles.card, background: colors.bg, marginTop: 10 }}>
          <div style={{ fontSize: 13 }}>Cash: {formatINR(totalCash)}</div>
          <div style={{ fontSize: 13 }}>CD: {formatINR(totalCd)}</div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Total: {formatINR(totalCash + totalCd)}</div>
        </div>
      )}

      <button style={{ ...styles.btn, marginTop: 12 }} disabled={!canSubmit} onClick={submit}>
        Save Collection
      </button>
    </div>
  );
}
