// src/App.jsx
import React, { useState, useEffect } from "react";
import { styles } from "./styles";
import { loadData, saveData, uid, todayISO } from "./lib/storage";

import Dashboard from "./tabs/Dashboard";
import AnalyticsTab from "./tabs/Analytics";
import IndentsTab from "./tabs/Indents";
import DispatchTab from "./tabs/Dispatch";
import CollectionsTab from "./tabs/Collections";
import { DebitNoteTab, CreditNoteTab } from "./tabs/Notes";
import OutstandingTab from "./tabs/Outstanding";
import ReportsTab from "./tabs/Reports";
import LedgerTab from "./tabs/Ledger";
import MastersTab from "./tabs/Masters";
import DataTools from "./tabs/DataTools";
import { calcGsmAndOz } from "./lib/textile";

const TABS = [
  ["dashboard", "Dashboard"],
  ["analytics", "Analytics"],
  ["indents", "Indents"],
  ["dispatch", "Dispatch"],
  ["collections", "Collections"],
  ["debitnotes", "Debit Note"],
  ["creditnotes", "Credit Note"],
  ["outstanding", "Outstanding"],
  ["reports", "Reports"],
  ["ledger", "Ledger"],
  ["masters", "Masters"],
];

export default function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState("dashboard");
  const [showDataTools, setShowDataTools] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  /* ---------- Masters: Mills, Buyers, Products ---------- */
  const addMill = (mill) => setData((d) => ({ ...d, mills: [...d.mills, { id: uid(), ...mill }] }));
  const updateMill = (id, changes) => setData((d) => ({ ...d, mills: d.mills.map((m) => (m.id === id ? { ...m, ...changes } : m)) }));
  const deleteMill = (id) => setData((d) => ({ ...d, mills: d.mills.filter((m) => m.id !== id) }));

  const addBuyer = (buyer) => setData((d) => ({ ...d, buyers: [...d.buyers, { id: uid(), ...buyer }] }));
  const updateBuyer = (id, changes) => setData((d) => ({ ...d, buyers: d.buyers.map((b) => (b.id === id ? { ...b, ...changes } : b)) }));
  const deleteBuyer = (id) => setData((d) => ({ ...d, buyers: d.buyers.filter((b) => b.id !== id) }));

  const addProduct = (product) => {
    const { gsm, oz } = calcGsmAndOz(product.weightGLM, product.width);
    setData((d) => ({ ...d, products: [...d.products, { id: uid(), ...product, gsm, oz }] }));
  };
  const updateProduct = (id, changes) => {
    const { gsm, oz } = calcGsmAndOz(changes.weightGLM, changes.width);
    setData((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...changes, gsm, oz } : p)) }));
  };
  const deleteProduct = (id) => setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));

  /* ---------- Settings & Import/Restore ---------- */
  const updateCdPolicy = (cdPolicy) => setData((d) => ({ ...d, settings: { ...d.settings, cdPolicy } }));

  const importMills = (rows) =>
    setData((d) => ({ ...d, mills: [...d.mills, ...rows.map((r) => ({ id: uid(), ...r }))] }));
  const importBuyers = (rows) =>
    setData((d) => ({ ...d, buyers: [...d.buyers, ...rows.map((r) => ({ id: uid(), ...r }))] }));
  const importProducts = (rows) =>
    setData((d) => ({
      ...d,
      products: [
        ...d.products,
        ...rows.map((r) => {
          const { gsm, oz } = calcGsmAndOz(r.weightGLM, r.width);
          return { id: uid(), ...r, gsm, oz };
        }),
      ],
    }));

  const restoreData = (backup) => {
    setData({
      mills: backup.mills || [],
      buyers: backup.buyers || [],
      products: backup.products || [],
      indents: backup.indents || [],
      collections: backup.collections || [],
      debitNotes: backup.debitNotes || [],
      creditNotes: backup.creditNotes || [],
      settings: backup.settings || { cdPolicy: {} },
    });
  };

  /* ---------- Indents & Dispatch ---------- */
  const addIndent = (indent) =>
    setData((d) => ({
      ...d,
      indents: [
        {
          id: uid(),
          indentNumber: "IND-" + (d.indents.length + 1).toString().padStart(4, "0"),
          date: todayISO(),
          status: "pending",
          dispatches: [],
          ...indent,
        },
        ...d.indents,
      ],
    }));

  const updateIndent = (id, changes) =>
    setData((d) => ({ ...d, indents: d.indents.map((i) => (i.id === id ? { ...i, ...changes } : i)) }));

  const deleteIndent = (id) => setData((d) => ({ ...d, indents: d.indents.filter((i) => i.id !== id) }));

  const addDispatch = (indentId, dispatch) =>
    setData((d) => ({
      ...d,
      indents: d.indents.map((i) => {
        if (i.id !== indentId) return i;
        const newDispatches = [...(i.dispatches || []), { id: uid(), ...dispatch }];
        const totalDispatched = newDispatches.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
        const ordered = Number(i.quantity) || 0;
        let status = i.status;
        if (totalDispatched >= ordered && ordered > 0) status = "fulfilled";
        else if (totalDispatched > 0) status = "partial_dispatch";
        return { ...i, dispatches: newDispatches, status };
      }),
    }));

  const deleteDispatch = (indentId, dispatchId) =>
    setData((d) => ({
      ...d,
      indents: d.indents.map((i) => {
        if (i.id !== indentId) return i;
        const newDispatches = (i.dispatches || []).filter((x) => x.id !== dispatchId);
        const totalDispatched = newDispatches.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
        const ordered = Number(i.quantity) || 0;
        let status = i.status;
        if (totalDispatched >= ordered && ordered > 0) status = "fulfilled";
        else if (totalDispatched > 0) status = "partial_dispatch";
        else status = "confirmed";
        return { ...i, dispatches: newDispatches, status };
      }),
    }));

  const updateDispatch = (indentId, dispatchId, changes) =>
    setData((d) => ({
      ...d,
      indents: d.indents.map((i) => {
        if (i.id !== indentId) return i;
        const newDispatches = (i.dispatches || []).map((x) => (x.id === dispatchId ? { ...x, ...changes } : x));
        const totalDispatched = newDispatches.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
        const ordered = Number(i.quantity) || 0;
        let status = i.status;
        if (totalDispatched >= ordered && ordered > 0) status = "fulfilled";
        else if (totalDispatched > 0) status = "partial_dispatch";
        return { ...i, dispatches: newDispatches, status };
      }),
    }));

  /* ---------- Collections & Notes ---------- */
  const addCollection = (collection) =>
    setData((d) => ({ ...d, collections: [{ id: uid(), ...collection }, ...d.collections] }));
  const deleteCollection = (id) =>
    setData((d) => ({ ...d, collections: d.collections.filter((c) => c.id !== id) }));

  const addDebitNote = (note) => setData((d) => ({ ...d, debitNotes: [{ id: uid(), ...note }, ...d.debitNotes] }));
  const deleteDebitNote = (id) => setData((d) => ({ ...d, debitNotes: d.debitNotes.filter((n) => n.id !== id) }));

  const addCreditNote = (note) => setData((d) => ({ ...d, creditNotes: [{ id: uid(), ...note }, ...d.creditNotes] }));
  const deleteCreditNote = (id) => setData((d) => ({ ...d, creditNotes: d.creditNotes.filter((n) => n.id !== id) }));

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.brand}>📦 Indenting Agency Manager</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{data.indents.length} indents · saved on this device</div>
          <button
            title="Backup / Restore / Import"
            onClick={() => setShowDataTools(true)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              width: 34,
              height: 34,
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            💾
          </button>
        </div>
      </div>

      <div style={styles.tabBar}>
        {TABS.map(([key, label]) => (
          <button key={key} style={styles.tabBtn(tab === key)} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <div style={styles.main}>
        {tab === "dashboard" && <Dashboard data={data} />}
        {tab === "analytics" && <AnalyticsTab data={data} />}
        {tab === "indents" && (
          <IndentsTab
            data={data}
            addIndent={addIndent}
            updateIndent={updateIndent}
            deleteIndent={deleteIndent}
            addDispatch={addDispatch}
            updateDispatch={updateDispatch}
            deleteDispatch={deleteDispatch}
          />
        )}
        {tab === "dispatch" && <DispatchTab data={data} />}
        {tab === "collections" && (
          <CollectionsTab
            data={data}
            addCollection={addCollection}
            deleteCollection={deleteCollection}
            updateCdPolicy={updateCdPolicy}
          />
        )}
        {tab === "debitnotes" && <DebitNoteTab data={data} addDebitNote={addDebitNote} deleteDebitNote={deleteDebitNote} />}
        {tab === "creditnotes" && <CreditNoteTab data={data} addCreditNote={addCreditNote} deleteCreditNote={deleteCreditNote} />}
        {tab === "outstanding" && <OutstandingTab data={data} />}
        {tab === "reports" && <ReportsTab data={data} />}
        {tab === "ledger" && <LedgerTab data={data} />}
        {tab === "masters" && (
          <MastersTab
            data={data}
            addMill={addMill}
            updateMill={updateMill}
            deleteMill={deleteMill}
            addBuyer={addBuyer}
            updateBuyer={updateBuyer}
            deleteBuyer={deleteBuyer}
            addProduct={addProduct}
            updateProduct={updateProduct}
            deleteProduct={deleteProduct}
          />
        )}
      </div>

      {showDataTools && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "20px 12px",
            overflowY: "auto",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDataTools(false);
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 700, width: "100%", marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button
                onClick={() => setShowDataTools(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}
              >
                ✕
              </button>
            </div>
            <DataTools
              data={data}
              restoreData={restoreData}
              importMills={importMills}
              importBuyers={importBuyers}
              importProducts={importProducts}
            />
          </div>
        </div>
      )}
    </div>
  );
}