// src/lib/cloudSync.js
// This is the whole "multiple devices, same data" engine:
// - loadCloudData()      → fetch the shared row when the app starts
// - saveCloudData()      → push local changes up to Supabase
// - subscribeToChanges() → listen for changes another device made,
//                          and pull them in live (no refresh needed)

import { supabase } from "./supabaseClient";
import { emptyData } from "./storage";

const ROW_ID = "default";

export async function loadCloudData() {
  const { data, error } = await supabase.from("app_data").select("data, updated_at").eq("id", ROW_ID).single();

  if (error) {
    // PGRST116 = "no row found" — first time setup, create the starting row
    if (error.code === "PGRST116") {
      const { data: inserted, error: insertErr } = await supabase
        .from("app_data")
        .insert({ id: ROW_ID, data: emptyData })
        .select("data, updated_at")
        .single();
      if (insertErr) throw insertErr;
      return { data: { ...emptyData, ...inserted.data }, updatedAt: inserted.updated_at };
    }
    throw error;
  }

  return {
    data: {
      ...emptyData,
      ...data.data,
      settings: { ...emptyData.settings, ...(data.data?.settings || {}) },
    },
    updatedAt: data.updated_at,
  };
}

export async function saveCloudData(data, userEmail) {
  const { data: row, error } = await supabase
    .from("app_data")
    .update({ data, updated_at: new Date().toISOString(), updated_by: userEmail || null })
    .eq("id", ROW_ID)
    .select("updated_at")
    .single();
  if (error) throw error;
  return row.updated_at;
}

// Calls onChange(newData, updatedAt) whenever ANY device updates the shared row.
// Returns an unsubscribe function — call it on component unmount.
export function subscribeToCloudChanges(onChange) {
  const channel = supabase
    .channel("app_data_changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "app_data", filter: `id=eq.${ROW_ID}` },
      (payload) => {
        onChange(payload.new.data, payload.new.updated_at, payload.new.updated_by);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
