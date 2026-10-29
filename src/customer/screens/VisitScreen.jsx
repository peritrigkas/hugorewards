import { MapPin, Instagram, Facebook, Music2 } from "lucide-react";
import { clientConfig } from "../../client.config";
import { BrandMark } from "../../components/BrandMark";

export function VisitScreen() {
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ height: 150, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, var(--c-gold) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--c-purple) 0%, transparent 50%), linear-gradient(160deg, var(--c-dark) 0%, var(--c-darkAlt) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 32, color: "var(--c-cream)" }}>Find Us</div>
      </div>
      <div style={{ padding: "28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <BrandMark size={70} />
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--c-dark)", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
          {clientConfig.location.intro}
        </div>
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--c-border)", padding: "22px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <MapPin color="var(--c-gold)" size={22} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--c-dark)" }}>Address</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginTop: 2 }}>{clientConfig.location.address}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 22, textAlign: "center", flexShrink: 0, fontSize: 16 }}>🕐</div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--c-dark)" }}>Hours</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginTop: 2 }}>{clientConfig.location.hours}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 22, textAlign: "center", flexShrink: 0, fontSize: 16 }}>📞</div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--c-dark)" }}>Contact</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginTop: 2 }}>{clientConfig.location.phone}</div>
            </div>
          </div>
        </div>
        <button style={{ width: "100%", background: "var(--c-dark)", color: "var(--c-cream)", border: "none", padding: "14px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 32 }}>
          Get Directions
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "var(--c-dark)", marginBottom: 14 }}>Follow us</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            {[Facebook, Music2, Instagram].map((Icon, i) => (
              <div key={i} style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--c-gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon color="var(--c-dark)" size={18} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
