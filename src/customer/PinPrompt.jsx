import { useState } from "react";
import { clientConfig } from "../client.config";
import { BrandMark } from "../components/BrandMark";

// Basic deterrent, not real security — this ships inside the app bundle, so anyone
// determined enough could find it. Fine for keeping casual customers out of the
// staff view; replace with real Supabase Auth before this matters for real security.
const STAFF_PIN = clientConfig.staffPin;

export function PinPrompt({ onSubmit, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pin === STAFF_PIN) {
      onSubmit();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,20,32,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
      <div style={{ background: "var(--c-cream)", borderRadius: 20, padding: "28px 24px", maxWidth: 320, width: "100%", textAlign: "center", animation: error ? "pin-shake 0.3s ease" : "none" }}>
        <BrandMark size={56} style={{ margin: "0 auto 14px" }} />
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "var(--c-dark)", marginBottom: 6 }}>Staff access</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginBottom: 18 }}>Enter the staff PIN to continue</div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          style={{ width: "100%", textAlign: "center", letterSpacing: 6, fontSize: 22, padding: "12px", borderRadius: 12, border: error ? "1px solid var(--c-error)" : "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", marginBottom: error ? 8 : 18, boxSizing: "border-box" }}
        />
        {error && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-error)", marginBottom: 10 }}>Wrong PIN — try again</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "var(--c-border)", color: "var(--c-dark)", border: "none", padding: "12px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} style={{ flex: 1, background: "var(--c-dark)", color: "var(--c-cream)", border: "none", padding: "12px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Enter</button>
        </div>
      </div>
    </div>
  );
}
