// src/App.jsx
import React, { useState, useEffect } from "react";
import { styles } from "./styles";
import { loadData, saveData, uid, todayISO } from "./lib/storage";

import Dashboard from "./tabs/Dashboard";
import IndentsTab from "./tabs/Indents";
import DispatchTab from "./tabs/Dispatch";
import CollectionsTab from "./tabs/Collections";
import { DebitNoteTab, CreditNoteTab } from "./tabs/Notes";
import OutstandingTab from "./tabs/Outstanding";
import ReportsTab from "./tabs/Reports";
import LedgerTab from "./tabs/Ledger";
import MastersTab from "./tabs/Masters";
import ProductsTab from "./tabs/Products";
import DataTools from "./tabs/DataTools";
import { calcGsmAndOz } from "./lib/textile";

const TABS = [
  ["dashboard", "Dashboard"],
  ["indents", "Indents"],
  ["dispatch", "Dispatch"],
  ["collections", "Collections"],
  ["debitnotes", "Debit Note"],
  ["creditnotes", "Credit Note"],
  ["outstanding", "Outstanding"],
  ["reports", "Reports"],
  ["ledger", "Ledger"],
  ["mills", "Mills"],
  ["buyers", "Buyers"],
  ["products", "Products"],
  ["datatools", "Backup/Import"],
];

export default function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    saveData(data);
  }, [data]);

  /* ---------- Mills ---------- */
  const addMill = (mill) => setData((d) => ({ ...d, mills: [...d.mills, { id: uid(), ...mill }] }));
  const deleteMill = (id) => setData((d) => ({ ...d, mills: d.mills.filter((m) => m.id !== id) }));

  /* ---------- Buyers ---------- */
  const addBuyer = (buyer) => setData((d) => ({ ...d, buyers: [...d.buyers, { id: uid(), ...buyer }] }));
  const deleteBuyer = (id) => setData((d) => ({ ...d, buyers: d.buyers.filter((b) => b.id !== id) }));

  /* ---------- Products ---------- */
  const addProduct = (product) => {
    const { gsm, oz } = calcGsmAndOz(product.weightGLM, product.width);
    setData((d) => ({ ...d, products: [...d.products, { id: uid(), ...product, gsm, oz }] }));
  };
  const deleteProduct = (id) => setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));

  /* ---------- CD Policy ---------- */
  const updateCdPolicy = (cdPolicy) => setData((d) => ({ ...d, settings: { ...d.settings, cdPolicy } }));

  /* ---------- Bulk import from Excel (Masters only) ---------- */
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

  /* ---------- Restore from backup file ---------- */
  const restoreData = (backup) => {
    setData({
      mills: backup.mills || [],
      buyers: backup.buyers || [],
      products: backup.products || [],
      indents: backup.indents || [],
      collections: backup.collections || [],
      debitNotes: backup.debitNotes || [],
      creditNotes: backup.creditNotes || [],
    });
  };

  /* ---------- Indents ---------- */
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

  /* ---------- Dispatch (nested inside indents) ---------- */
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

  /* ---------- Collections ---------- */
  const addCollection = (collection) =>
    setData((d) => ({ ...d, collections: [{ id: uid(), ...collection }, ...d.collections] }));
  const deleteCollection = (id) =>
    setData((d) => ({ ...d, collections: d.collections.filter((c) => c.id !== id) }));

  /* ---------- Debit / Credit Notes ---------- */
  const addDebitNote = (note) => setData((d) => ({ ...d, debitNotes: [{ id: uid(), ...note }, ...d.debitNotes] }));
  const deleteDebitNote = (id) => setData((d) => ({ ...d, debitNotes: d.debitNotes.filter((n) => n.id !== id) }));

  const addCreditNote = (note) => setData((d) => ({ ...d, creditNotes: [{ id: uid(), ...note }, ...d.creditNotes] }));
  const deleteCreditNote = (id) => setData((d) => ({ ...d, creditNotes: d.creditNotes.filter((n) => n.id !== id) }));

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.brand}>📦 Indenting Agency Manager</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {data.indents.length} indents · saved on this device
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

        {tab === "indents" && (
          <IndentsTab
            data={data}
            addIndent={addIndent}
            updateIndent={updateIndent}
            deleteIndent={deleteIndent}
            addDispatch={addDispatch}
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

        {tab === "debitnotes" && (
          <DebitNoteTab data={data} addDebitNote={addDebitNote} deleteDebitNote={deleteDebitNote} />
        )}

        {tab === "creditnotes" && (
          <CreditNoteTab data={data} addCreditNote={addCreditNote} deleteCreditNote={deleteCreditNote} />
        )}

        {tab === "outstanding" && <OutstandingTab data={data} />}

        {tab === "reports" && <ReportsTab data={data} />}

        {tab === "ledger" && <LedgerTab data={data} />}

        {tab === "mills" && (
          <MastersTab
            title="Mills / Suppliers"
            items={data.mills}
            onAdd={addMill}
            onDelete={deleteMill}
            fields={[
              { key: "name", label: "Mill Name", required: true },
              { key: "phone", label: "Phone (with country code, e.g. 91...)" },
              { key: "address", label: "Full Address" },
              { key: "gst", label: "GST Number" },
              { key: "commissionPct", label: "Default Commission %", type: "number" },
              { key: "paymentTerms", label: "Payment Terms" },
            ]}
          />
        )}

        {tab === "buyers" && (
          <MastersTab
            title="Buyers"
            items={data.buyers}
            onAdd={addBuyer}
            onDelete={deleteBuyer}
            fields={[
              { key: "name", label: "Business Name", required: true },
              { key: "phone", label: "Phone (with country code, e.g. 91...)" },
              { key: "address", label: "Full Address" },
              { key: "gst", label: "GST Number" },
              { key: "creditDays", label: "Credit Days", type: "number" },
            ]}
          />
        )}

        {tab === "products" && <ProductsTab items={data.products} onAdd={addProduct} onDelete={deleteProduct} />}

        {tab === "datatools" && (
          <DataTools
            data={data}
            restoreData={restoreData}
            importMills={importMills}
            importBuyers={importBuyers}
            importProducts={importProducts}
          />
        )}
      </div>
    </div>
  );
}
