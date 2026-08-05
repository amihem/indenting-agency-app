// src/Auth.jsx
import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { colors } from "./styles";

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created. If email confirmation is on, check your inbox — otherwise you can log in now.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage("Password reset link sent. Check your email (including Spam) and click the link to set a new password.");
      }
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
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: colors.indigo }}>📦 Indenting Agency Manager</div>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
          {mode === "login" && "Log in to access your business data"}
          {mode === "signup" && "Create an account to get started"}
          {mode === "forgot" && "Enter your email to receive a password reset link"}
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}
          />

          {mode !== "forgot" && (
            <>
              <label style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
              />
            </>
          )}

          {mode === "login" && (
            <div style={{ textAlign: "right", marginBottom: 16, marginTop: -8 }}>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
                style={{ background: "none", border: "none", color: colors.textMuted, fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && <div style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {message && <div style={{ color: colors.success, fontSize: 13, marginBottom: 12 }}>{message}</div>}

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
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Log In"
              : mode === "signup"
              ? "Create Account"
              : "Send Reset Link"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          {mode === "login" && (
            <>
              Don't have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: colors.indigo, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                Sign up
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: colors.indigo, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                Log in
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: colors.indigo, fontWeight: 700, cursor: "pointer", padding: 0 }}>
              ← Back to log in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
