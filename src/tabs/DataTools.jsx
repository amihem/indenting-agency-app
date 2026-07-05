// src/tabs/DataTools.jsx
import React, { useState, useRef } from "react";
import { styles, colors } from "../styles";
import { downloadBackup, readBackupFile } from "../lib/backup";
import { parseExcelFile, mapMillRow, mapBuyerRow, mapProductRow } from "../lib/excelImport";

export default function DataTools({ data, restoreData, importMills, importBuyers, importProducts }) {
  return (
    <div>
      <div style={styles.h2}>Backup, Restore &amp; Import</div>

      <BackupSection data={data} />
      <RestoreSection restoreData={restoreData} />

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
function ImportSection({ title, expectedColumns, mapRow, onImport, renderPreview }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setPreview([]);
    try {
      const rows = await parseExcelFile(file);
      const mapped = rows.map(mapRow).filter((r) => r.name); // skip blank rows
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
