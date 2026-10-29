import { BrandMark } from "../../components/BrandMark";
import { QrCanvas } from "../../components/QrCanvas";

export function ScanCodeScreen({ customer }) {
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ height: 130, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, var(--c-gold) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--c-purple) 0%, transparent 50%), linear-gradient(160deg, var(--c-dark) 0%, var(--c-darkAlt) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 28, color: "var(--c-cream)" }}>Scan Code</div>
      </div>
      <div style={{ padding: "28px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", textAlign: "center", border: "1px solid var(--c-border)", boxShadow: "0 8px 24px rgba(26,20,32,0.08)" }}>
          <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "var(--c-dark)", marginBottom: 4 }}>Show this to staff</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginBottom: 24 }}>Scanned at checkout to add a stamp or redeem a reward</div>
          <div style={{ display: "inline-block", padding: 16, background: "var(--c-cream)", borderRadius: 16, border: "2px solid var(--c-dark)" }}>
            <QrCanvas value={customer.code} size={190} />
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1, color: "var(--c-gold)", marginTop: 16 }}>{customer.code}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, padding: "0 4px" }}>
          <BrandMark size={32} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-muted)", lineHeight: 1.5 }}>
            Your code stays the same — no need to screenshot it, just open this screen at the counter.
          </div>
        </div>
      </div>
    </div>
  );
}
