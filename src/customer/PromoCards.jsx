// Customer-facing cards beyond the main one (developent-docs/promo-cards-design.md):
// the promo card, finished cards in "Past cards", and the new-promo banner.
import { X } from "lucide-react";
import { clientConfig } from "../client.config";
import { StampCard } from "../components/StampCard";
import { claimUntil, daysBetween, formatDay, isPromoCardFull } from "../lib/promos";

const cardBox = { background: "#fff", borderRadius: 20, border: "1px solid var(--c-border)", boxShadow: "0 8px 24px rgba(26,20,32,0.08)", position: "relative", overflow: "hidden" };
const title = { fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "var(--c-dark)" };
const footnote = { textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-faint)", marginTop: 12 };

export function MainCard({ customer }) {
  return (
    <div style={{ ...cardBox, padding: "24px 20px" }}>
      <div style={{ ...title, marginBottom: 16 }}>{clientConfig.brandName} Loyalty Card</div>
      <StampCard stamps={customer.stamps} />
      <div style={footnote}>Code: {customer.code}</div>
    </div>
  );
}

function promoStatus({ promo, stamps, phase }, today) {
  const n = promo.stamps_for_reward;
  if (phase === "claim") return `Ended. Claim your free reward by ${formatDay(claimUntil(promo))}`;
  if (isPromoCardFull(promo, stamps)) return "Card full! Show staff your code to claim";
  const left = daysBetween(today, promo.ends_on);
  return `${stamps} of ${n} · ${n + 1}${ordinalSuffix(n + 1)} free · ${left === 0 ? "last day" : `${left} day${left === 1 ? "" : "s"} left`}`;
}

function ordinalSuffix(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
}

// A running promo, or an ended one whose full card can still be claimed.
export function PromoCard({ card, today }) {
  const { promo, stamps, phase } = card;
  return (
    <div data-testid="promo-card" style={{ ...cardBox, border: "2px solid var(--c-gold)" }}>
      <div style={{ background: "var(--c-gold)", padding: "6px 16px", display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, color: "var(--c-dark)" }}>
        <span>LIMITED TIME</span>
        <span>{phase === "claim" ? "ENDED" : "ENDS"} {formatDay(promo.ends_on).toUpperCase()}</span>
      </div>
      <div style={{ padding: "16px 20px 20px" }}>
        <div style={{ ...title, marginBottom: 14 }}>{promo.name}</div>
        <StampCard stamps={stamps} stampsForReward={promo.stamps_for_reward} icon={promo.icon} />
        <div style={footnote}>{promoStatus(card, today)}</div>
      </div>
    </div>
  );
}

// A redeemed or expired card: a faded copy with a mark across it.
export function PastCard({ card }) {
  const redeemed = card.outcome === "redeemed";
  const name = card.isMain ? `${clientConfig.brandName} Loyalty Card` : card.name;
  const icon = card.icon ?? (card.isMain ? clientConfig.loyalty.stampIcon : undefined);
  return (
    <div data-testid="past-card" style={{ ...cardBox, padding: "24px 20px", marginBottom: 16 }}>
      <div style={{ opacity: 0.45, filter: "grayscale(0.6)" }}>
        <div style={{ ...title, marginBottom: 16 }}>{name}</div>
        <StampCard stamps={card.stamps} stampsForReward={card.stampsForReward} icon={icon} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ transform: "rotate(-14deg)", border: `3px solid ${redeemed ? "var(--c-gold)" : "var(--c-inactive)"}`, color: redeemed ? "var(--c-gold)" : "var(--c-muted)", background: "rgba(255,255,255,0.85)", borderRadius: 10, padding: "6px 16px", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 1.5, whiteSpace: "nowrap" }}>
          {redeemed ? "REDEEMED" : "EXPIRED"} · {formatDay(card.day)}
        </div>
      </div>
    </div>
  );
}

// Shown once per promo, until tapped.
export function NewPromoBanner({ promo, onDismiss }) {
  const n = promo.stamps_for_reward;
  return (
    <div data-testid="new-promo-banner" onClick={onDismiss} style={{ margin: "16px 20px 0", background: "var(--c-gold)", borderRadius: 16, padding: "14px 16px", fontFamily: "Inter, sans-serif", display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--c-dark)", marginBottom: 4 }}>New: {promo.name}!</div>
        <div style={{ fontSize: 13, color: "var(--c-dark)" }}>
          Collect {n} stamp{n === 1 ? "" : "s"} on your {promo.name} card and the next one's free. Until {formatDay(promo.ends_on)}.
        </div>
      </div>
      <X size={18} color="var(--c-dark)" aria-label="Dismiss" />
    </div>
  );
}
