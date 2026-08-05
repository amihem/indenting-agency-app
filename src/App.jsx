// src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import { styles } from "./styles";
import { loadData, saveData, uid, todayISO } from "./lib/storage";
import { supabase, supabaseConfigured } from "./lib/supabaseClient";
import { loadCloudData, saveCloudData, subscribeToCloudChanges } from "./lib/cloudSync";
import Auth from "./Auth";
import ResetPassword from "./ResetPassword";

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
import {
  importIndentsIntoData,
  importDispatchesIntoData,
  importDebitNotesIntoData,
  importCreditNotesIntoData,
  importPaymentsIntoData,
} from "./lib/bulkImport";
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

/* ============================================================
   Root component: decides between "not logged in" (Auth screen)
   and "logged in" (the actual app, wrapped so it only mounts —
   and only starts loading/syncing data — once we have a session).
   If Supabase isn't configured (.env missing), it skips auth
   entirely and behaves exactly like the old local-only version.
   ============================================================ */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = "still checking", null = "logged out"
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setSession(null); // local-only mode — no auth gate
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />;
  }

  if (supabaseConfigured && session === undefined) {
    return <FullScreenMessage text="Loading..." />;
  }

  if (supabaseConfigured && !session) {
    return <Auth />;
  }

  return <MainApp session={session} />;
}

function FullScreenMessage({ text }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontFamily: "sans-serif" }}>
      {text}
    </div>
  );
}

/* ============================================================
   MainApp: the actual business app. Data now comes from Supabase
   (shared across every device/user logged in) instead of only
   this browser's localStorage — localStorage is still used as an
   instant local cache so the app opens fast and still works
   offline; it resyncs automatically once back online.
   ============================================================ */
function MainApp({ session }) {
  const [data, setData] = useState(loadData); // start from local cache instantly
  const [tab, setTab] = useState("dashboard");
  const [reportSection, setReportSection] = useState("sales");
  const [showDataTools, setShowDataTools] = useState(false);
  const [syncStatus, setSyncStatus] = useState(supabaseConfigured ? "loading" : "local-only"); // loading | synced | saving | offline | local-only | error

  const lastKnownUpdatedAt = useRef(null);
  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);
  const skipNextSave = useRef(false);

  /* ---------- Initial cloud load, once, after login ---------- */
  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    loadCloudData()
      .then(({ data: cloudData, updatedAt }) => {
        if (cancelled) return;
        skipNextSave.current = true; // don't immediately re-save what we just loaded
        setData(cloudData);
        lastKnownUpdatedAt.current = updatedAt;
        setSyncStatus("synced");
      })
      .catch((err) => {
        console.error("Cloud load failed, using local cache:", err);
        setSyncStatus("offline");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Realtime: pull in changes made by other devices ---------- */
  useEffect(() => {
    if (!supabaseConfigured) return;
    const unsubscribe = subscribeToCloudChanges((newData, updatedAt) => {
      if (updatedAt === lastKnownUpdatedAt.current) return; // this is our own save echoing back
      skipNextSave.current = true; // don't re-save what we just received
      setData({ ...newData });
      lastKnownUpdatedAt.current = updatedAt;
      setSyncStatus("synced");
    });
    return unsubscribe;
  }, []);

  /* ---------- Save on every change: local cache instantly, cloud debounced ---------- */
  useEffect(() => {
    saveData(data); // instant local cache — app still works offline

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!supabaseConfigured) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    setSyncStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveCloudData(data, session?.user?.email)
        .then((updatedAt) => {
          lastKnownUpdatedAt.current = updatedAt;
          setSyncStatus("synced");
        })
        .catch((err) => {
          console.error("Cloud save failed:", err);
          setSyncStatus("offline");
        });
    }, 1200); // debounce so rapid edits don't spam the network

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

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

  const importMills = (rows) => setData((d) => ({ ...d, mills: [...d.mills, ...rows.map((r) => ({ id: uid(), ...r }))] }));
  const importBuyers = (rows) => setData((d) => ({ ...d, buyers: [...d.buyers, ...rows.map((r) => ({ id: uid(), ...r }))] }));
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

  /* ---------- Historical transaction imports (old years' data) ---------- */
  function runBulkImport(importFn, rows) {
    setData((d) => {
      const result = importFn(d, rows);
      if (result.warnings.length > 0) {
        alert(
          `Imported ${result.imported} row(s).\n\n${result.warnings.length} row(s) had issues:\n` +
            result.warnings.slice(0, 20).join("\n") +
            (result.warnings.length > 20 ? `\n...and ${result.warnings.length - 20} more` : "")
        );
      }
      return result.data;
    });
  }

  const importIndents = (rows) => runBulkImport(importIndentsIntoData, rows);
  const importDispatches = (rows) => runBulkImport(importDispatchesIntoData, rows);
  const importDebitNotesBulk = (rows) => runBulkImport(importDebitNotesIntoData, rows);
  const importCreditNotesBulk = (rows) => runBulkImport(importCreditNotesIntoData, rows);
  const importPayments = (rows) => runBulkImport(importPaymentsIntoData, rows);

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

  const updateIndent = (id, changes) => setData((d) => ({ ...d, indents: d.indents.map((i) => (i.id === id ? { ...i, ...changes } : i)) }));
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
  const addCollection = (collection) => setData((d) => ({ ...d, collections: [{ id: uid(), ...collection }, ...d.collections] }));
  const deleteCollection = (id) => setData((d) => ({ ...d, collections: d.collections.filter((c) => c.id !== id) }));

  const addDebitNote = (note) => setData((d) => ({ ...d, debitNotes: [{ id: uid(), ...note }, ...d.debitNotes] }));
  const deleteDebitNote = (id) => setData((d) => ({ ...d, debitNotes: d.debitNotes.filter((n) => n.id !== id) }));

  const addCreditNote = (note) => setData((d) => ({ ...d, creditNotes: [{ id: uid(), ...note }, ...d.creditNotes] }));
  const deleteCreditNote = (id) => setData((d) => ({ ...d, creditNotes: d.creditNotes.filter((n) => n.id !== id) }));

  const syncLabel = {
    loading: "⏳ Loading...",
    saving: "🔄 Saving...",
    synced: "✅ Synced",
    offline: "⚠️ Offline (saved on this device)",
    "local-only": "💾 Local only",
    error: "⚠️ Sync error",
  }[syncStatus];

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.brand}>📦 Indenting Agency Manager</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{syncLabel}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{data.indents.length} indents</div>
          {supabaseConfigured && session && (
            <div style={{ fontSize: 11, opacity: 0.7 }}>{session.user.email}</div>
          )}
          <button
            title="Backup / Restore / Import"
            onClick={() => setShowDataTools(true)}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 34, height: 34, color: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            💾
          </button>
          {supabaseConfigured && (
            <button
              title="Sign Out"
              onClick={handleSignOut}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 34, height: 34, color: "#fff", fontSize: 16, cursor: "pointer" }}
            >
              🚪
            </button>
          )}
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
        {tab === "dashboard" && (
          <Dashboard
            data={data}
            setTab={setTab}
            goToReports={(section) => {
              setReportSection(section);
              setTab("reports");
            }}
          />
        )}
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
          <CollectionsTab data={data} addCollection={addCollection} deleteCollection={deleteCollection} updateCdPolicy={updateCdPolicy} />
        )}
        {tab === "debitnotes" && <DebitNoteTab data={data} addDebitNote={addDebitNote} deleteDebitNote={deleteDebitNote} />}
        {tab === "creditnotes" && <CreditNoteTab data={data} addCreditNote={addCreditNote} deleteCreditNote={deleteCreditNote} />}
        {tab === "outstanding" && <OutstandingTab data={data} />}
        {tab === "reports" && <ReportsTab data={data} initialSection={reportSection} />}
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 12px", overflowY: "auto", zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDataTools(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 700, width: "100%", marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setShowDataTools(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            <DataTools
              data={data}
              restoreData={restoreData}
              importMills={importMills}
              importBuyers={importBuyers}
              importProducts={importProducts}
              importIndents={importIndents}
              importDispatches={importDispatches}
              importDebitNotesBulk={importDebitNotesBulk}
              importCreditNotesBulk={importCreditNotesBulk}
              importPayments={importPayments}
            />
          </div>
        </div>
      )}
    </div>
  );
}
