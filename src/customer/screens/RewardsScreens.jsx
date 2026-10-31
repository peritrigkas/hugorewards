import { useState } from "react";
import { ChevronRight, Gift } from "lucide-react";
import { clientConfig } from "../../client.config";
import { MainCard, PastCard, PromoCard } from "../PromoCards";

function RewardsHero() {
  return (
    <div style={{ height: 150, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, var(--c-gold) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--c-purple) 0%, transparent 50%), linear-gradient(160deg, var(--c-dark) 0%, var(--c-darkAlt) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 32, color: "var(--c-cream)" }}>Your Rewards</div>
    </div>
  );
}

function RewardsTile({ title, body, cta, bg, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: bg, borderRadius: 20, padding: "26px 22px", margin: "0 20px 20px", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 20, color, marginBottom: 12, letterSpacing: 0.3 }}>{title}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color, opacity: 0.9, lineHeight: 1.5, marginBottom: 28 }}>{body}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, color, letterSpacing: 0.5 }}>{cta}</span>
        <ChevronRight size={16} color={color} />
      </div>
    </div>
  );
}

function HowToEarn() {
  const steps = clientConfig.howToEarn;
  return (
    <div style={{ padding: "8px 20px 32px" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 24, color: "var(--c-dark)", marginBottom: 18 }}>How to start earning</div>
      {steps.map((s) => (
        <div key={s.n} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--c-dark)", marginBottom: 4 }}>{s.n}) {s.title}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--c-muted)", lineHeight: 1.5 }}>{s.body}</div>
        </div>
      ))}
    </div>
  );
}

export function RewardsHome({ goToCards, goToGifts }) {
  return (
    <div style={{ paddingBottom: 100 }}>
      <RewardsHero />
      <div style={{ height: 20 }} />
      <RewardsTile title="MY LOYALTY CARDS" body={clientConfig.loyalty.cardsPromoBody} cta="VIEW CARDS" bg="var(--c-dark)" color="var(--c-cream)" onClick={goToCards} />
      <RewardsTile title="MY GIFTS" body="Check what's waiting for you — like a free coffee on your birthday." cta="VIEW GIFT LIST" bg="var(--c-gold)" color="var(--c-dark)" onClick={goToGifts} />
      <HowToEarn />
    </div>
  );
}

export function LoyaltyCardDetail({ customer, promoCards, pastCards, today }) {
  const [tab, setTab] = useState("active");
  const tabs = [["active", `Active (${1 + promoCards.length})`], ["past", "Past cards"]];
  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ display: "flex", padding: "20px 20px 0" }}>
        {tabs.map(([t, label]) => (
          <div key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: "center", paddingBottom: 12, borderBottom: tab === t ? "2px solid var(--c-dark)" : "2px solid transparent", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: tab === t ? "var(--c-dark)" : "var(--c-inactive)", cursor: "pointer" }}>
            {label}
          </div>
        ))}
      </div>
      {tab === "active" ? (
        <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <MainCard customer={customer} />
          {promoCards.map((card) => <PromoCard key={card.promo.id} card={card} today={today} />)}
        </div>
      ) : pastCards.length > 0 ? (
        <div style={{ padding: "24px 20px" }}>
          {pastCards.map((card) => <PastCard key={card.key} card={card} />)}
        </div>
      ) : (
        <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-faint)" }}>
          No past cards yet — your redeemed and expired cards will show up here.
        </div>
      )}
    </div>
  );
}

export function GiftsView() {
  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding: "24px 20px" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 22, color: "var(--c-dark)", marginBottom: 18 }}>My Gifts</div>
        <div style={{ background: "var(--c-lilac)", borderRadius: 18, padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: "50%", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Gift color="var(--c-dark)" size={24} />
          </div>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--c-dark)" }}>{clientConfig.gift.title}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-darkAlt)", marginTop: 2 }}>{clientConfig.gift.body}</div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-faint)", marginTop: 24 }}>
          Nothing else waiting right now — check back after your next few visits.
        </div>
      </div>
    </div>
  );
}
