// src/tabs/DataTools.jsx
import React, { useState, useRef } from "react";
import { styles, colors } from "../styles";
import { downloadBackup, readBackupFile } from "../lib/backup";
import { parseExcelFile, mapMillRow, mapBuyerRow, mapProductRow, mapIndentRow, mapDispatchRow, mapDebitNoteRow, mapCreditNoteRow, mapPaymentRow } from "../lib/excelImport";
import SearchableSelect from "../components/SearchableSelect";
import { findDuplicateInvoiceNumbers } from "../lib/calc";
import { formatINR, formatDate } from "../lib/storage";

export default function DataTools({
  data,
  restoreData,
  importMills,
  importBuyers,
  importProducts,
  importIndents,
  importDispatches,
  importDebitNotesBulk,
  importCreditNotesBulk,
  importPayments,
  mergeBuyers,
  mergeMills,
}) {
  return (
    <div>
      <div style={styles.h2}>Backup, Restore &amp; Import</div>

      <BackupSection data={data} />
      <RestoreSection restoreData={restoreData} />

      <div style={{ ...styles.h2, marginTop: 24 }}>Data Health Check</div>
      <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        Flags Mill Invoice Numbers that were reused across more than one
        dispatch for the same buyer. When that happens, a payment recorded
        "against" that invoice number is ambiguous — verify each case below
        in the Collections tab to make sure the money was applied to the
        correct dispatch.
      </p>
      <DuplicateInvoiceNumberCheck data={data} />

      <div style={{ ...styles.h2, marginTop: 24 }}>Merge Duplicate Records</div>
      <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        If the same Buyer or Mill got created twice (e.g. "Nishika Trading Co" vs
        "Nishika Trading Company" from a bulk import), merge them here — every
        Indent, Collection, Debit/Credit Note tied to the duplicate moves onto
        the one you keep, then the duplicate is removed.
      </p>
      <MergeSection title="Merge Buyers" items={data.buyers} onMerge={mergeBuyers} />
      <MergeSection title="Merge Mills" items={data.mills} onMerge={mergeMills} />

      <div style={{ ...styles.h2, marginTop: 24 }}>Import Masters from Excel</div>
      <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        This imports Mills, Buyers, or Products only — not past indents/transactions.
        Upload a .xlsx, .xls, or .csv file with the columns shown below.
      </p>

      <ImportSection
        title="Import Suppliers (Mills)"
        expectedColumns={["Name", "Phone", "Address", "GST", "Commission%", "Payment Terms"]}
        mapRow={mapMillRow}
        onImport={importMills}
        renderPreview={(m) => `${m.name} · ${m.phone || "no phone"} · ${m.commissionPct || 0}%`}
      />

      <ImportSection
        title="Import Customers (Buyers)"
        expectedColumns={["Name", "Phone", "Address", "GST", "Credit Days"]}
        mapRow={mapBuyerRow}
        onImport={importBuyers}
        renderPreview={(b) => `${b.name} · ${b.phone || "no phone"} · GST: ${b.gst || "—"}`}
      />

      <ImportSection
        title="Import Products"
        expectedColumns={["Product Name", "Unit", "Commercial No", "Dying", "Type", "GLM", "Width", "Finish", "Packing"]}
        mapRow={mapProductRow}
        onImport={importProducts}
        renderPreview={(p) => `${p.name} · ${p.unit} · Width: ${p.width || "—"}"`}
      />

      <div style={{ ...styles.h2, marginTop: 28 }}>Import Historical Transactions</div>
      <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
        For old years' data (past Indents, Dispatch, Notes, Payments). Import in this
        order — Indents first, then Dispatch, then Notes/Payments — since each depends
        on the ones before it. Missing Buyer/Mill/Product names are auto-created so no
        data is lost; fill their details later in Masters.
      </p>

      <ImportSection
        title="1. Import Indents"
        expectedColumns={["Indent No", "Indent Date", "Buyer Name", "Mill Name", "Product Name", "Shade", "Order Qty", "Unit", "Rate", "Status"]}
        mapRow={mapIndentRow}
        onImport={importIndents}
        isValidRow={(r) => r.buyerName && r.millName && r.productName}
        renderPreview={(r) => `${r.indentNumber || "(auto)"} · ${r.buyerName} ← ${r.millName} · ${r.productName} · ${r.quantity} ${r.unit} @ ₹${r.rate}`}
      />

      <ImportSection
        title="2. Import Dispatch"
        expectedColumns={["Indent No", "Dispatch Date", "Qty", "Mill Invoice No", "Invoice Date", "LR No", "LR Date", "Transporter", "Freight"]}
        mapRow={mapDispatchRow}
        onImport={importDispatches}
        isValidRow={(r) => r.indentNumber && r.qty}
        renderPreview={(r) => `Indent ${r.indentNumber} · ${r.qty} on ${r.date || "?"} · Inv: ${r.invoiceNumber || "—"}`}
      />

      <ImportSection
        title="3. Import Debit Notes"
        expectedColumns={["Buyer Name", "Date", "Amount", "Reason"]}
        mapRow={mapDebitNoteRow}
        onImport={importDebitNotesBulk}
        isValidRow={(r) => r.buyerName && r.amount}
        renderPreview={(r) => `${r.buyerName} · ₹${r.amount} · ${r.date || "?"}`}
      />

      <ImportSection
        title="4. Import Credit Notes"
        expectedColumns={["Buyer Name", "Date", "Amount", "Reason"]}
        mapRow={mapCreditNoteRow}
        onImport={importCreditNotesBulk}
        isValidRow={(r) => r.buyerName && r.amount}
        renderPreview={(r) => `${r.buyerName} · ₹${r.amount} · ${r.date || "?"}`}
      />

      <ImportSection
        title="5. Import Payments (Collections)"
        expectedColumns={["Buyer Name", "Date", "Amount", "Mode", "Reference", "Against Invoice No", "CD %", "CD Amount"]}
        mapRow={mapPaymentRow}
        onImport={importPayments}
        isValidRow={(r) => r.buyerName && r.amount}
        renderPreview={(r) => `${r.buyerName} · ₹${r.amount} · ${r.mode} ${r.againstInvoiceNo ? "· vs Inv " + r.againstInvoiceNo : "(FIFO match)"}`}
      />
    </div>
  );
}

/* ---------------- Backup ---------------- */
function BackupSection({ data }) {
  const counts = `${data.mills.length} mills · ${data.buyers.length} buyers · ${data.products.length} products · ${data.indents.length} indents`;
  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Backup</div>
      <div style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
        Downloads everything ({counts}) as one JSON file. Keep this safe — it's your
        only copy if this browser's data is ever cleared or you switch devices.
      </div>
      <button style={styles.btn} onClick={() => downloadBackup(data)}>
        Download Backup
      </button>
    </div>
  );
}

/* ---------------- Restore ---------------- */
function RestoreSection({ restoreData }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = await readBackupFile(file);
      const confirmed = window.confirm(
        "This will REPLACE all current data in the app with the backup file's data. This cannot be undone. Continue?"
      );
      if (confirmed) {
        restoreData(parsed);
        setStatus({ ok: true, message: "Backup restored successfully." });
      }
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ ...styles.card, borderColor: colors.danger }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Restore</div>
      <div style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
        ⚠️ Restoring replaces ALL current data in this app with the backup file. Take a
        fresh backup first if you're not sure.
      </div>
      <input ref={fileRef} type="file" accept=".json" onChange={handleFile} />
      {status && (
        <div style={{ marginTop: 10, color: status.ok ? colors.success : colors.danger, fontSize: 13 }}>
          {status.message}
        </div>
      )}
    </div>
  );
}

/* ---------------- Generic Excel Import section ---------------- */
function ImportSection({ title, expectedColumns, mapRow, onImport, renderPreview, isValidRow }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const validCheck = isValidRow || ((r) => r.name);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setPreview([]);
    try {
      const rows = await parseExcelFile(file);
      const mapped = rows.map(mapRow).filter(validCheck);
      if (mapped.length === 0) {
        setError("No valid rows found. Check that your column headers match the expected format below.");
        return;
      }
      setPreview(mapped);
    } catch (err) {
      setError(err.message);
    }
  }

  function confirmImport() {
    onImport(preview);
    setPreview([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{title}</div>
      <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>
        Expected columns: <strong>{expectedColumns.join(", ")}</strong>
      </div>

      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />

      {error && <div style={{ color: colors.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}

      {preview.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            Found <strong>{preview.length}</strong> rows to import:
          </div>
          <div
            style={{
              maxHeight: 160,
              overflowY: "auto",
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 8,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            {preview.slice(0, 30).map((row, i) => (
              <div key={i} style={{ padding: "3px 0" }}>
                {renderPreview(row)}
              </div>
            ))}
            {preview.length > 30 && (
              <div style={{ color: colors.textMuted }}>...and {preview.length - 30} more</div>
            )}
          </div>
          <button style={styles.btn} onClick={confirmImport}>
            Confirm Import ({preview.length} rows)
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Merge Duplicate Records ---------------- */
function MergeSection({ title, items, onMerge }) {
  const [keepId, setKeepId] = useState("");
  const [mergeId, setMergeId] = useState("");

  const keepName = items.find((i) => i.id === keepId)?.name || "";
  const mergeName = items.find((i) => i.id === mergeId)?.name || "";
  const canMerge = keepId && mergeId && keepId !== mergeId;

  function handleMerge() {
    if (!canMerge) return;
    const ok = window.confirm(
      `⚠️ Merge "${mergeName}" into "${keepName}"?\n\n` +
        `Every record currently linked to "${mergeName}" will be moved onto "${keepName}", ` +
        `and "${mergeName}" will then be permanently deleted. This cannot be undone.`
    );
    if (ok) {
      onMerge(keepId, mergeId);
      setKeepId("");
      setMergeId("");
    }
  }

  return (
    <div style={{ ...styles.card, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{title}</div>
      <div style={styles.row2}>
        <div>
          <label style={styles.label}>Keep this one</label>
          <SearchableSelect
            value={keepId}
            onChange={setKeepId}
            options={items.map((i) => ({ id: i.id, label: i.name }))}
            placeholder="Select record to keep"
          />
        </div>
        <div>
          <label style={styles.label}>Merge this duplicate into it</label>
          <SearchableSelect
            value={mergeId}
            onChange={setMergeId}
            options={items.filter((i) => i.id !== keepId).map((i) => ({ id: i.id, label: i.name }))}
            placeholder="Select duplicate to merge"
          />
        </div>
      </div>
      <button style={styles.btnDanger} disabled={!canMerge} onClick={handleMerge}>
        Merge "{mergeName || "..."}" into "{keepName || "..."}"
      </button>
    </div>
  );
}

/* ---------------- Data Health Check: duplicate Invoice Numbers ---------------- */
function DuplicateInvoiceNumberCheck({ data }) {
  const buyerName = (id) => data.buyers.find((b) => b.id === id)?.name || "—";
  const groups = findDuplicateInvoiceNumbers(data.indents);

  if (groups.length === 0) {
    return (
      <div style={{ ...styles.card, color: colors.success, textAlign: "center" }}>
        ✅ No duplicate invoice numbers found — every Mill Invoice Number is unique per buyer.
      </div>
    );
  }

  return (
    <div style={{ ...styles.card, borderColor: colors.danger }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: colors.danger, marginBottom: 10 }}>
        ⚠️ {groups.length} duplicate Invoice Number case(s) found
      </div>
      {groups.map((g, i) => (
        <div key={i} style={{ borderTop: i > 0 ? `1px dashed ${colors.border}` : "none", paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {buyerName(g.buyerId)} — Invoice No "{g.invoiceNo}" ({g.entries.length} dispatches)
          </div>
          {g.entries.map((e, j) => (
            <div key={j} style={{ fontSize: 12, color: colors.textMuted, marginLeft: 12 }}>
              Indent {e.indentNumber} · {formatDate(e.date)} · Qty {e.qty} · Value {formatINR((Number(e.qty) || 0) * (Number(e.rate) || 0))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
