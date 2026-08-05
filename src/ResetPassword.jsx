// src/ResetPassword.jsx
import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { colors } from "./styles";

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: 16,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 380, border: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: colors.indigo }}>Set New Password</div>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>Choose a new password for your account.</div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}
          />

          <label style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Confirm New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
          />

          {error && <div style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: colors.indigo,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "11px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Saving..." : "Save New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
