import { useState } from "react";
import { signInStaff } from "../lib/staffAuth";
import { BrandMark } from "../components/BrandMark";

export function StaffLogin({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 15, marginBottom: 14, boxSizing: "border-box" };

  const submit = async () => {
    setBusy(true);
    setError("");
    const ok = await signInStaff(email, password);
    setBusy(false);
    if (!ok) {
      setError("Incorrect email or password.");
    } else {
      onLoggedIn();
    }
  };

  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 340, width: "100%", textAlign: "center" }}>
        <BrandMark size={64} style={{ margin: "0 auto 14px" }} />
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 24, color: "var(--c-dark)", marginBottom: 4 }}>Staff sign in</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginBottom: 22 }}>Sign in with your staff account to add stamps.</div>
        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        {error && <p style={{ fontFamily: "Inter, sans-serif", color: "var(--c-error)", fontSize: 13, marginTop: -6, marginBottom: 12 }}>{error}</p>}
        <button
          disabled={!email || !password || busy}
          onClick={submit}
          style={{ width: "100%", background: email && password && !busy ? "var(--c-dark)" : "var(--c-lilac)", color: "var(--c-cream)", border: "none", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, cursor: email && password && !busy ? "pointer" : "not-allowed" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
