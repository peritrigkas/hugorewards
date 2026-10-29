import {
  Menu, User, Home, Star, QrCode, UtensilsCrossed, MapPin, ChevronLeft, X, Instagram, Facebook,
  Music2,
} from "lucide-react";
import { clientConfig } from "../client.config";

export function TopBar({ onBack, onMenu, onSecretTap, onAccount }) {
  return (
    <div style={{ background: "var(--c-dark)", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {onBack ? (
        <ChevronLeft color="var(--c-cream)" size={24} onClick={onBack} style={{ cursor: "pointer" }} />
      ) : (
        <Menu color="var(--c-cream)" size={24} onClick={onMenu} style={{ cursor: "pointer" }} />
      )}
      <div
        onClick={onSecretTap}
        style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 26, color: "var(--c-cream)", userSelect: "none" }}
      >
        {clientConfig.brandName}
      </div>
      <User data-testid="open-account" color="var(--c-cream)" size={24} onClick={onAccount} style={{ cursor: onAccount ? "pointer" : "default" }} />
    </div>
  );
}

export function DrawerMenu({ open, onClose, navigate }) {
  const items = [
    { icon: Home, label: "Home", screen: "home" },
    { icon: Star, label: "My Rewards", screen: "rewards" },
    { icon: QrCode, label: "Scan Code", screen: "scan" },
    { icon: UtensilsCrossed, label: "Menu", screen: "menu" },
    { icon: MapPin, label: "Visit Us", screen: "visit" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,20,32,0.5)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.25s ease", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, width: "78%", maxWidth: 320, background: "var(--c-cream)", zIndex: 50, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s ease", boxShadow: open ? "4px 0 24px rgba(0,0,0,0.2)" : "none", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 24px" }}>
          <X color="var(--c-dark)" size={24} onClick={onClose} style={{ cursor: "pointer" }} />
        </div>
        {items.map((item) => (
          <div key={item.screen} onClick={() => { navigate(item.screen); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 24px", cursor: "pointer" }}>
            <item.icon color="var(--c-gold)" size={24} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "var(--c-dark)" }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "24px", display: "flex", gap: 12, justifyContent: "center" }}>
          {[Facebook, Music2, Instagram].map((Icon, i) => (
            <div key={i} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--c-gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon color="var(--c-dark)" size={18} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function BottomNav({ screen, navigate }) {
  const tabs = [
    { icon: Home, label: "Home", screen: "home" },
    { icon: Star, label: "Rewards", screen: "rewards" },
    { icon: QrCode, label: "Scan Code", screen: "scan" },
    { icon: UtensilsCrossed, label: "Menu", screen: "menu" },
    { icon: MapPin, label: "Visit", screen: "visit" },
  ];
  const rewardsGroup = ["rewards", "cards", "gifts"];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid var(--c-border)", display: "flex", padding: "10px 4px 14px", maxWidth: 420, margin: "0 auto", zIndex: 10 }}>
      {tabs.map((t, i) => {
        const isActive = t.screen === "rewards" ? rewardsGroup.includes(screen) : t.screen === screen;
        return (
          <div key={i} data-testid={`nav-${t.screen}`} onClick={() => navigate(t.screen)} style={{ flex: 1, textAlign: "center", cursor: "pointer" }}>
            <t.icon color={isActive ? "var(--c-gold)" : "var(--c-inactive)"} size={22} style={{ margin: "0 auto" }} />
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: isActive ? "var(--c-gold)" : "var(--c-inactive)", marginTop: 4 }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}
