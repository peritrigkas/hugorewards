import { clientConfig } from "../../client.config";
import { BrandMark } from "../../components/BrandMark";
import { photoBackground } from "./HomeScreen";

export function MenuScreen() {
  const categories = clientConfig.menu.categories;
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ height: 150, position: "relative", overflow: "hidden", background: clientConfig.menu.imageUrl ? photoBackground(clientConfig.menu.imageUrl) : "radial-gradient(circle at 20% 30%, var(--c-gold) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--c-purple) 0%, transparent 50%), linear-gradient(160deg, var(--c-dark) 0%, var(--c-darkAlt) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 32, color: "var(--c-cream)" }}>{clientConfig.menu.title || "Our Menu"}</div>
      </div>
      <div style={{ padding: "28px 20px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "var(--c-dark)", lineHeight: 1.6, marginBottom: 32 }}>
          {clientConfig.menu.intro}
        </div>
        {categories.map((c) => (
          <div key={c.title} style={{ marginBottom: 26 }}>
            {c.imageUrl && (
              <img src={c.imageUrl} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 16, display: "block", marginBottom: 12 }} />
            )}
            <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "var(--c-dark)", marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--c-muted)", lineHeight: 1.6 }}>{c.body}</div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, padding: "16px 4px 0", borderTop: "1px solid var(--c-border)" }}>
          <BrandMark size={30} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-faint)", lineHeight: 1.5 }}>
            {clientConfig.menu.footerNote}
          </div>
        </div>
      </div>
    </div>
  );
}
