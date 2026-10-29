import { useState } from "react";
import { clientConfig } from "../../client.config";
import { BrandMark } from "../../components/BrandMark";

export function JoinScreen({ onJoin }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 15, marginBottom: 14, boxSizing: "border-box" };

  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <BrandMark size={72} style={{ margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 30, color: "var(--c-dark)", marginBottom: 6 }}>{clientConfig.brandName}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--c-muted)", marginBottom: 24 }}>
          {clientConfig.joinTagline}
        </div>
        <input style={inputStyle} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={inputStyle} placeholder="Phone or email" value={contact} onChange={(e) => setContact(e.target.value)} />
        {error && <p style={{ fontFamily: "Inter, sans-serif", color: "var(--c-error)", fontSize: 13, marginTop: -6, marginBottom: 12 }}>{error}</p>}
        <button
          disabled={!name || !contact || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            const ok = await onJoin(name, contact);
            setBusy(false);
            if (!ok) setError("Couldn't join right now — check your connection and try again.");
          }}
          style={{ width: "100%", background: name && contact && !busy ? "var(--c-dark)" : "var(--c-lilac)", color: "var(--c-cream)", border: "none", padding: "14px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, cursor: name && contact && !busy ? "pointer" : "not-allowed" }}
        >
          {busy ? "Joining…" : `Join ${clientConfig.fullBrandName}`}
        </button>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-faint)", marginTop: 14 }}>
          {clientConfig.joinReturningNote}
        </div>
      </div>
    </div>
  );
}
