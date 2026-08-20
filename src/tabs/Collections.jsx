// src/tabs/Collections.jsx
import React, { useState } from "react";
import { styles, colors } from "../styles";
import { formatINR, formatDate, todayISO } from "../lib/storage";
import { pendingInvoicesForCollectionEntry, calcCdPct, roundRupee } from "../lib/calc";
import { shareCollection } from "../lib/whatsapp";
import { printReport } from "../lib/print";
import SearchableSelect from "../components/SearchableSelect";

export default function CollectionsTab({ data, addCollection, updateCollection, deleteCollection, updateCdPolicy }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const getBuyer = (id) => data.buyers.find((b) => b.id === id);

  const q = searchQuery.trim().toLowerCase();
  let visible = data.collections;
  if (filterBuyer) visible = visible.filter((c) => c.buyerId === filterBuyer);
  if (filterFrom) visible = visible.filter((c) => c.date >= filterFrom);
  if (filterTo) visible = visible.filter((c) => c.date <= filterTo);
  if (q) {
    visible = visible.filter((c) => {
      const invoiceMatch = (c.allocations || []).some((a) => (a.invoiceNo || a.indentNumber || "").toLowerCase().includes(q));
      return (
        (c.paymentId || "").toLowerCase().includes(q) ||
        buyerName(c.buyerId).toLowerCase().includes(q) ||
        (c.mode || "").toLowerCase().includes(q) ||
        (c.reference || "").toLowerCase().includes(q) ||
        (c.date || "").includes(q) ||
        invoiceMatch
      );
    });
  }
  const sorted = [...visible].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Grand total now explicitly tracks ONLY actual cash received
  const grandTotalCash = visible.reduce(
    (s, c) => s + (c.allocations || []).reduce((s2, a) => s2 + roundRupee(a.amount), 0),
    0
  );

  function exportPDF() {
    const rows = sorted
      .map((c) => {
        const cashTotal = (c.allocations || []).reduce((s, a) => s + roundRupee(a.amount), 0);
        const cdTotal = (c.allocations || []).reduce((s, a) => s + roundRupee(a.cdAmount), 0);
        const invoices = (c.allocations || []).map((a) => a.invoiceNo || a.indentNumber).join(", ");
        return `<tr><td>${c.paymentId || "—"}</td><td>${formatDate(c.date)}</td><td>${buyerName(c.buyerId)}</td><td>${c.mode}</td><td>${c.reference || "—"}</td><td>${invoices}</td><td>${formatINR(cashTotal)}</td><td>${formatINR(cdTotal)}</td></tr>`;
      })
      .join("");
    const html = `
      <table>
        <thead><tr><th>Payment ID</th><th>Date</th><th>Buyer</th><th>Mode</th><th>Reference</th><th>Against Invoice(s)</th><th>Cash Received</th><th>CD Allowed</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:14px"><strong>Grand Total Cash Collected: ${formatINR(grandTotalCash)}</strong></p>
    `;
    printReport("Collection Report", html, "Cash received vs Cash Discount allowed, per payment");
  }

  function startEdit(c) {
    setEditingCollection(c);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingCollection(null);
  }

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.h2}>Collections (Payments Received)</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btnGhost} onClick={() => setShowPolicy((s) => !s)}>
            {showPolicy ? "Hide CD Policy" : "CD Policy"}
          </button>
          <button
            style={styles.btn}
            onClick={() => {
              if (showForm) closeForm();
              else {
                setEditingCollection(null);
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Cancel" : "+ Record Collection"}
          </button>
        </div>
      </div>

      {showPolicy && <CdPolicyEditor policy={data.settings.cdPolicy} onSave={updateCdPolicy} />}

      {showForm && (
        <CollectionForm
          data={data}
          editingCollection={editingCollection}
          onSave={(c) => {
            if (editingCollection) {
              updateCollection(editingCollection.id, c);
            } else {
              addCollection(c);
            }
            closeForm();
          }}
        />
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          style={{ ...styles.input, marginBottom: 0 }}
          type="text"
          placeholder="🔍 Search by Payment ID, Buyer, Mode, Reference, or Invoice No..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={styles.filterBar}>
        <div>
          <label style={styles.label}>Buyer</label>
          <SearchableSelect
            value={filterBuyer}
            onChange={setFilterBuyer}
            options={data.buyers.map((b) => ({ id: b.id, label: b.name }))}
            placeholder="All buyers"
          />
        </div>
        <div>
          <label style={styles.label}>From Date</label>
          <input style={{ ...styles.input, marginBottom: 0 }} type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label style={styles.label}>To Date</label>
          <input style={{ ...styles.input, marginBottom: 0 }} type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
      </div>

      <div style={{ ...styles.card, background: colors.indigo, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Total Cash Collected (filtered)</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{formatINR(grandTotalCash)}</div>
        </div>
        <button style={styles.btnPdf} onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      {sorted.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", color: colors.textMuted }}>
          No collections found.
        </div>
      )}

      {sorted.map((c) => {
        const cashTotal = (c.allocations || []).reduce((s, a) => s + roundRupee(a.amount), 0);
        return (
          <div key={c.id} style={styles.listItem}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.primary }}>{c.paymentId || "—"}</div>
                <strong>Cash: {formatINR(cashTotal)}</strong> from {buyerName(c.buyerId)}
                <div style={{ fontSize: 12, color: colors.textMuted }}>
                  {formatDate(c.date)} · {c.mode} {c.reference ? `· Ref: ${c.reference}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...styles.btnGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(c)}>
                  Edit
                </button>
                <button style={styles.btnDanger} onClick={() => deleteCollection(c.id)}>
                  Delete
                </button>
              </div>
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
  const [maxCreditDays, setMaxCreditDays] = useState(policy?.maxCreditDays || 120);
  const [tiers, setTiers] = useState(policy?.tiers || []);

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
          <button style={styles.btnDanger} onClick={() => removeTier(i)}>✕</button>
        </div>
      ))}

      <button style={styles.btnGhost} onClick={addTier}>+ Add Tier</button>

      <div style={{ marginTop: 14 }}>
        <label style={styles.label}>Maximum Credit Period Allowed (days)</label>
        <input style={{ ...styles.input, width: 160 }} type="number" value={maxCreditDays} onChange={(e) => setMaxCreditDays(e.target.value)} />
      </div>

      <button style={styles.btn} onClick={save}>Save CD Policy</button>
    </div>
  );
}

/* ---------------- Collection entry form (invoice-based mapping) ----------------
   Handles BOTH creating a new collection and editing an existing one.
   When editing, the invoice being edited is excluded from the "pending
   balance" calculation (so it doesn't look like it's already fully paid by
   itself), and its own allocations are pre-selected. */
function CollectionForm({ data, editingCollection, onSave }) {
  const isEditing = Boolean(editingCollection);
  const [buyerId, setBuyerId] = useState(editingCollection?.buyerId || "");
  const [date, setDate] = useState(editingCollection?.date || todayISO());
  const [mode, setMode] = useState(editingCollection?.mode || "NEFT");
  const [reference, setReference] = useState(editingCollection?.reference || "");
  const [selected, setSelected] = useState(() => {
    if (!editingCollection) return {};
    const init = {};
    (editingCollection.allocations || []).forEach((a) => {
      init[a.dispatchId] = {
        checked: true,
        invoiceValue: null, // filled in once pendingInvoices resolves below
        amount: a.amount,
        cdAmount: a.cdAmount,
        cdPct: a.cdPct,
        isCustomCd: false,
        invoiceNo: a.invoiceNo,
        indentNumber: a.indentNumber,
        indentId: a.indentId,
      };
    });
    return init;
  });

  const cdPolicy = data.settings.cdPolicy || { tiers: [] };
  const cdOptions = [{ label: "No CD (0%)", pct: 0 }, ...cdPolicy.tiers.map((t) => ({ label: `${t.label} — ${t.pct}%`, pct: t.pct })), { label: "Custom Amount", pct: "custom" }];

  // Collections list used to compute "what's still pending" excludes the
  // collection being edited, so its own invoices show their true balance.
  const collectionsForBalance = isEditing
    ? data.collections.filter((c) => c.id !== editingCollection.id)
    : data.collections;

  const pendingInvoices = buyerId
    ? pendingInvoicesForCollectionEntry(buyerId, data.indents, data.mills, collectionsForBalance, cdPolicy)
    : [];

  function toggleInvoice(inv) {
    setSelected((s) => {
      const existing = s[inv.key];
      if (existing?.checked) {
        return { ...s, [inv.key]: { ...existing, checked: false } };
      }
      const cdPct = inv.suggestedCdPct || 0;
      const cdAmount = roundRupee((inv.value * cdPct) / 100);
      return {
        ...s,
        [inv.key]: {
          checked: true,
          invoiceValue: inv.value,
          amount: Math.max(inv.balance - cdAmount, 0),
          cdAmount: cdAmount,
          cdPct,
          isCustomCd: false,
          invoiceNo: inv.invoiceNo,
          indentNumber: inv.indentNumber,
          indentId: inv.indentId,
        },
      };
    });
  }

  function updateCdPct(key, val) {
    setSelected((s) => {
      const item = s[key];
      if (val === "custom") {
        return { ...s, [key]: { ...item, cdPct: 0, cdAmount: 0, isCustomCd: true } };
      }
      const pct = Number(val);
      const inv = pendingInvoices.find((i) => i.key === key);
      const invoiceValue = item.invoiceValue ?? inv?.value ?? 0;
      const cdAmount = roundRupee((invoiceValue * pct) / 100);
      const newAmount = Math.max((inv?.balance ?? item.amount) - cdAmount, 0);
      return { ...s, [key]: { ...item, cdPct: pct, cdAmount, amount: newAmount, isCustomCd: false } };
    });
  }

  function updateAmount(key, field, value) {
     setSelected((s) => ({ ...s, [key]: { ...s[key], [field]: Number(value) } }));
  }

  const allocations = Object.entries(selected)
    .filter(([, v]) => v.checked)
    .map(([dispatchId, v]) => {
      const amount = roundRupee(v.amount);
      const cdAmount = roundRupee(v.cdAmount);
      return { dispatchId, indentId: v.indentId, indentNumber: v.indentNumber, invoiceNo: v.invoiceNo, amount, cdPct: v.cdPct, cdAmount };
    });

  const totalCash = allocations.reduce((s, a) => s + a.amount, 0);
  const totalCd = allocations.reduce((s, a) => s + a.cdAmount, 0);
  const canSubmit = buyerId && allocations.length > 0 && totalCash + totalCd > 0;

  function submit() {
    if (!canSubmit) return;
    onSave({ buyerId, date, mode, reference, allocations });
  }

  // Invoices already selected (e.g. from editing) but no longer in the
  // "currently pending" list still need to render so the checkbox stays visible.
  const extraSelectedInvoices = Object.entries(selected)
    .filter(([key, v]) => v.checked && !pendingInvoices.some((inv) => inv.key === key))
    .map(([key, v]) => ({
      key,
      invoiceNo: v.invoiceNo,
      indentNumber: v.indentNumber,
      value: v.invoiceValue ?? v.amount + v.cdAmount,
      balance: v.amount + v.cdAmount,
      days: null,
      suggestedCdPct: v.cdPct,
    }));

  const invoicesToShow = [...pendingInvoices, ...extraSelectedInvoices];

  return (
    <div style={styles.card}>
      {isEditing && (
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.mustard, marginBottom: 10 }}>
          Editing Payment {editingCollection.paymentId}
        </div>
      )}
      <div style={styles.row3}>
        <div>
          <label style={styles.label}>Buyer *</label>
          <SearchableSelect
            value={buyerId}
            onChange={(id) => { setBuyerId(id); if (!isEditing) setSelected({}); }}
            options={data.buyers.map((b) => ({ id: b.id, label: b.name, sublabel: b.phone }))}
            placeholder="Select buyer"
          />
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
          <div style={{ fontWeight: 700, fontSize: 13, margin: "10px 0" }}>Pending Invoices</div>
          {invoicesToShow.length === 0 && (
            <div style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>No pending invoices.</div>
          )}
          {invoicesToShow.map((inv) => {
            const sel = selected[inv.key];
            return (
              <div key={inv.key} style={{ border: `1px solid ${sel?.checked ? colors.indigo : colors.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!sel?.checked} onChange={() => toggleInvoice(inv)} />
                  <span>
                    Inv <strong>{inv.invoiceNo || inv.indentNumber}</strong> · Val: {formatINR(inv.value)} · Bal: {formatINR(inv.balance)}
                    {inv.days != null ? ` · ${inv.days} days` : ""}
                  </span>
                </label>

                {sel?.checked && (
                  <div style={{ ...styles.row2, marginTop: 8 }}>
                    <div>
                      <label style={styles.label}>CD Option</label>
                      <select style={{ ...styles.input, marginBottom: 0 }} value={sel.isCustomCd ? "custom" : sel.cdPct} onChange={(e) => updateCdPct(inv.key, e.target.value)}>
                        {cdOptions.map((opt) => (
                          <option key={opt.pct + opt.label} value={opt.pct}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    {sel.isCustomCd && (
                         <div>
                             <label style={styles.label}>CD Amount</label>
                             <input style={{ ...styles.input, marginBottom: 0 }} type="number" value={sel.cdAmount} onChange={(e) => updateAmount(inv.key, 'cdAmount', e.target.value)} />
                         </div>
                    )}
                    <div>
                      <label style={styles.label}>Cash Received (₹)</label>
                      <input style={{ ...styles.input, marginBottom: 0 }} type="number" value={sel.amount} onChange={(e) => updateAmount(inv.key, 'amount', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {allocations.length > 0 && (
        <div style={{ ...styles.card, background: colors.bg, marginTop: 10 }}>
          <div style={{ fontSize: 13 }}>Total Cash: {formatINR(totalCash)}</div>
          <div style={{ fontSize: 13 }}>Total CD: {formatINR(totalCd)}</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>Credit Applied: {formatINR(totalCash + totalCd)}</div>
        </div>
      )}

      <button style={{ ...styles.btn, marginTop: 12 }} disabled={!canSubmit} onClick={submit}>
        {isEditing ? "Save Changes" : "Save Collection"}
      </button>
    </div>
  );
}
