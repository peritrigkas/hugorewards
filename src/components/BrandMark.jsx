import { useState } from "react";
import { clientConfig } from "../client.config";

function CowMark({ size = 40, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <path d="M28 30 Q14 18 20 4 Q30 10 32 26 Z" fill="#1A1420" />
      <path d="M70 28 Q90 22 92 2 Q76 4 66 22 Q66 22 70 28" fill="#1A1420" />
      <ellipse cx="16" cy="46" rx="13" ry="9" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3.5" transform="rotate(-18 16 46)" />
      <ellipse cx="86" cy="42" rx="15" ry="10" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3.5" transform="rotate(24 86 42)" />
      <path d="M50 12 C72 12 82 30 80 52 C78 74 66 90 50 90 C34 90 22 74 20 52 C18 30 28 12 50 12 Z" fill="#F6EEDF" stroke="#1A1420" strokeWidth="4" />
      <path d="M60 20 Q76 26 72 44 Q64 50 56 40 Q52 26 60 20 Z" fill="#C9A8DC" stroke="#1A1420" strokeWidth="2.5" />
      <circle cx="38" cy="52" r="13" fill="#fff" stroke="#1A1420" strokeWidth="3" />
      <circle cx="38" cy="52" r="5.5" fill="#1A1420" />
      <circle cx="35.5" cy="49.5" r="1.6" fill="#fff" />
      <path d="M62 48 Q68 44 74 48" stroke="#1A1420" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M62 54 Q68 58 74 54" stroke="#1A1420" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="74" rx="20" ry="13" fill="#fff" stroke="#1A1420" strokeWidth="3.2" />
      <ellipse cx="43" cy="74" rx="2.6" ry="3.6" fill="#1A1420" />
      <ellipse cx="57" cy="74" rx="2.6" ry="3.6" fill="#1A1420" />
      <path d="M46 84 Q44 96 52 98 Q60 96 54 84 Z" fill="#E38699" stroke="#1A1420" strokeWidth="2.5" />
      <path d="M48 88 Q52 90 51 94" stroke="#1A1420" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// The tenant's logo, Hugo's built-in cow, or (for a tenant with neither)
// their initial in a circle — see logoUrl/mark in client.config.js. Inline
// like the cow SVG it replaces, so callers' centering keeps working.
export function BrandMark({ size = 40, style }) {
  const [failed, setFailed] = useState(false);
  if (clientConfig.logoUrl && !failed) {
    return (
      <img src={clientConfig.logoUrl} alt={clientConfig.brandName} width={size} height={size} onError={() => setFailed(true)}
        style={{ display: "inline-block", verticalAlign: "middle", objectFit: "contain", ...style }} />
    );
  }
  if (clientConfig.mark === "cow") return <CowMark size={size} style={style} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--c-dark)", color: "var(--c-cream)", display: "inline-flex", verticalAlign: "middle", alignItems: "center", justifyContent: "center", fontFamily: "Baloo 2, sans-serif", fontWeight: 700, fontSize: size * 0.5, lineHeight: 1, ...style }}>
      {clientConfig.brandName.charAt(0).toUpperCase()}
    </div>
  );
}
