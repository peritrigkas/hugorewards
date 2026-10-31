import {
  Star, Gift, Bean, Coffee, Croissant, Cookie, IceCreamCone, Leaf, Flower2, Scissors, Dumbbell,
  PawPrint, Heart, Cake, Sandwich, Salad, Pizza, CupSoda,
} from "lucide-react";
import { clientConfig } from "../client.config";
import { isRewardReady } from "../lib/loyalty";
import { STAMPS_FOR_REWARD } from "../loyaltySettings";

// One spot per stamp, filled left to right, all clear of the body outline and
// the head; COW_FREE_SPOT is the extra "10th's on the cow" reward spot.
const COW_SPOTS = [
  { cx: 18, cy: 60, r: 7 }, { cx: 25, cy: 40, r: 9 }, { cx: 40, cy: 60, r: 10 },
  { cx: 48, cy: 30, r: 8 }, { cx: 58, cy: 74, r: 6 }, { cx: 64, cy: 52, r: 8 },
  { cx: 72, cy: 28, r: 9 }, { cx: 86, cy: 60, r: 9 }, { cx: 96, cy: 36, r: 8 },
];

const COW_FREE_SPOT = { cx: 108, cy: 58, r: 8 };

// Choices for loyalty.stampIcon (see client.config.js) and for promo cards.
export const STAMP_ICONS = {
  bean: Bean, coffee: Coffee, croissant: Croissant, cookie: Cookie, "ice-cream": IceCreamCone,
  leaf: Leaf, flower: Flower2, scissors: Scissors, dumbbell: Dumbbell, paw: PawPrint, heart: Heart, star: Star,
  cake: Cake, sandwich: Sandwich, salad: Salad, pizza: Pizza, soda: CupSoda,
};

// The main card by default; a promo card passes its own count and icon.
export function StampCard({ stamps, stampsForReward = STAMPS_FOR_REWARD, icon = clientConfig.loyalty.stampIcon }) {
  // The cow card has exactly one spot per stamp, so it only fits that many.
  if (icon === "cow" && stampsForReward === COW_SPOTS.length) return <CowStampCard stamps={stamps} />;
  const Icon = STAMP_ICONS[icon];
  const isComplete = isRewardReady(stamps, stampsForReward);
  const slot = { width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 300, margin: "0 auto" }}>
      {Array.from({ length: stampsForReward }, (_, i) => {
        const filled = i < stamps;
        return (
          <div key={i} style={{ ...slot, background: filled ? "var(--c-dark)" : "var(--c-cream)", border: filled ? "2px solid var(--c-dark)" : "2px dashed var(--c-divider)", color: filled ? "var(--c-cream)" : "var(--c-inactive)" }}>
            {Icon && <Icon size={24} strokeWidth={2} />}
          </div>
        );
      })}
      {/* The reward itself — "buy N, the next one's free". */}
      <div style={{ ...slot, background: isComplete ? "var(--c-gold)" : "var(--c-cream)", border: isComplete ? "2px solid var(--c-gold)" : "2px dashed var(--c-gold)", color: "var(--c-dark)" }}>
        {isComplete ? <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13 }}>free!</span> : <Gift size={22} strokeWidth={2} color="var(--c-gold)" />}
      </div>
    </div>
  );
}

function CowStampCard({ stamps }) {
  const isComplete = isRewardReady(stamps, STAMPS_FOR_REWARD);
  const free = COW_FREE_SPOT;
  return (
    <svg width="100%" viewBox="-2 -4 160 100" style={{ maxWidth: 320, display: "block", margin: "0 auto" }}>
      <ellipse cx="65" cy="50" rx="60" ry="34" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3" />
      <circle cx="130" cy="34" r="20" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3" />
      <path d="M117 16 L108 -2 L126 10 Z" fill="#1A1420" />
      <path d="M143 16 L155 -1 L149 18 Z" fill="#1A1420" />
      <circle cx="137" cy="30" r="3" fill="#1A1420" />
      <circle cx="121" cy="34" r="2.6" fill="#1A1420" />
      <path d="M116 42 Q130 50 144 42" stroke="#1A1420" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {[10, 35, 90, 115].map((x, i) => (
        <rect key={i} x={x} y="78" width="9" height="16" rx="4" fill="#1A1420" />
      ))}
      {COW_SPOTS.map((s, i) => {
        const filled = i < stamps;
        return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={filled ? "#1A1420" : "#F6EEDF"} stroke="#1A1420" strokeWidth={filled ? 0 : 2} />;
      })}
      <circle cx={free.cx} cy={free.cy} r={free.r} fill={isComplete ? clientConfig.colors.gold : "#F6EEDF"} stroke={clientConfig.colors.gold} strokeWidth="2" strokeDasharray={isComplete ? undefined : "3 2"} />
      <text x={free.cx} y={free.cy + 2.2} textAnchor="middle" fontSize="6" fill="#1A1420" fontFamily="Inter, sans-serif" fontWeight="700">
        {isComplete ? "free!" : "free"}
      </text>
    </svg>
  );
}
