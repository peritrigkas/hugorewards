import React from "react";
import { Star, Instagram, Facebook, Music2 } from "lucide-react";
import { clientConfig } from "../../client.config";
import { STAMPS_FOR_REWARD } from "../../loyaltySettings";
import { BrandMark } from "../../components/BrandMark";
import { STAMP_ICONS } from "../../components/StampCard";
import { NewPromoBanner, PromoCard } from "../PromoCards";

// Hugo keeps its ☕ / 🐮 emoji; other tenants get their stamp icon and logo.
const StatStampIcon = clientConfig.loyalty.stampIcon === "cow" ? null : STAMP_ICONS[clientConfig.loyalty.stampIcon] || Star;

function StatBlock({ value, label, emoji }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 26, color: "var(--c-dark)", fontWeight: 700 }}>{value}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18 }}>{emoji}</div>
    </div>
  );
}

function Greeting({ customer, cardCount }) {
  return (
    <div style={{ padding: "28px 20px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 24, color: "var(--c-dark)", marginBottom: 4 }}>
        Hey {customer.name.split(" ")[0]}!
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--c-muted)", marginBottom: 22 }}>
        {clientConfig.greetingSubtitle}
      </div>
      <div style={{ display: "flex" }}>
        <StatBlock value={customer.stamps} label="Stamps" emoji={StatStampIcon ? <StatStampIcon size={20} color="var(--c-dark)" /> : "☕"} />
        <div style={{ width: 1, background: "var(--c-divider)" }} />
        <StatBlock value="0" label="Gift List" emoji="🎁" />
        <div style={{ width: 1, background: "var(--c-divider)" }} />
        <StatBlock value={cardCount} label="Cards" emoji={clientConfig.mark === "cow" && !clientConfig.logoUrl ? "🐮" : <BrandMark size={22} />} />
      </div>
    </div>
  );
}

function HeroBanner() {
  return (
    <div style={{ margin: "0 0 24px", background: "linear-gradient(160deg, var(--c-lilac) 0%, var(--c-purple) 100%)", padding: "50px 24px", textAlign: "center" }}>
      <BrandMark size={90} style={{ margin: "0 auto 8px", opacity: 0.9 }} />
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 40, color: "var(--c-dark)", lineHeight: 1.05 }}>
        {clientConfig.hero.titleLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SwirlDivider() {
  return (
    <div style={{ height: 200, margin: "0 0 32px", position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, var(--c-gold) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--c-purple) 0%, transparent 50%), linear-gradient(160deg, var(--c-dark) 0%, var(--c-darkAlt) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 34, color: "var(--c-cream)", textAlign: "center", lineHeight: 1.1 }}>
        {clientConfig.hero.swirlLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function EarnRewardsCard({ onView }) {
  return (
    <div style={{ padding: "0 20px", marginBottom: 32 }}>
      <div onClick={onView} style={{ background: "linear-gradient(160deg, var(--c-lilac) 0%, var(--c-purple) 100%)", borderRadius: 20, padding: "32px 24px", textAlign: "center", position: "relative", overflow: "hidden", cursor: "pointer" }}>
        <div style={{ position: "absolute", top: -14, right: -14, opacity: 0.2 }}>
          <BrandMark size={140} />
        </div>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 26, color: "var(--c-dark)", marginBottom: 10, position: "relative" }}>Earn Rewards</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--c-darkAlt)", marginBottom: 22, position: "relative" }}>{clientConfig.loyalty.earnCardBody}</div>
        <button style={{ background: "var(--c-dark)", color: "var(--c-cream)", border: "none", padding: "12px 28px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", position: "relative" }}>
          View Rewards
        </button>
      </div>
    </div>
  );
}

function MenuStrip() {
  const items = clientConfig.menuStrip;
  return (
    <div style={{ padding: "0 20px", marginBottom: 32 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "var(--c-dark)", marginBottom: 14 }}>On the menu</div>
      <div style={{ display: "flex", gap: 12 }}>
        {items.map((item) => (
          <div key={item.name} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ background: item.bg, borderRadius: 16, border: "2px solid var(--c-dark)", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <BrandMark size={44} />
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, color: "var(--c-dark)" }}>{item.name}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--c-muted)" }}>{item.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressSection({ customer }) {
  const pct = (customer.stamps / STAMPS_FOR_REWARD) * 100;
  return (
    <div style={{ padding: "0 20px", marginBottom: 32 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "var(--c-dark)", marginBottom: 16 }}>My Stamp Progress</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 22, color: "var(--c-gold)", fontWeight: 700, whiteSpace: "nowrap" }}>{customer.stamps}/{STAMPS_FOR_REWARD}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-dark)", marginBottom: 8 }}>{clientConfig.loyalty.progressLabel(STAMPS_FOR_REWARD)}</div>
          <div style={{ position: "relative" }}>
            <div style={{ height: 14, borderRadius: 999, background: "var(--c-border)", border: "2px solid var(--c-dark)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--c-gold)", borderRadius: 999, transition: "width 0.3s ease" }} />
            </div>
            <div style={{ position: "absolute", right: -6, top: -14 }}>
              <BrandMark size={30} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FollowUs() {
  return (
    <div style={{ textAlign: "center", paddingBottom: 100 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "var(--c-dark)", marginBottom: 18 }}>Follow us</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
        {[Facebook, Music2, Instagram].map((Icon, i) => (
          <div key={i} style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--c-gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon color="var(--c-dark)" size={22} />
          </div>
        ))}
      </div>
    </div>
  );
}

// The running promo's card (and any full card still to claim from an ended
// one), right under the greeting where it's seen.
function PromoCards({ cards, today }) {
  if (cards.length === 0) return null;
  return (
    <div style={{ padding: "0 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 16 }}>
      {cards.map((card) => <PromoCard key={card.promo.id} card={card} today={today} />)}
    </div>
  );
}

export function HomeScreen({ customer, promoCards, today, newPromo, onDismissNewPromo, goToRewards }) {
  return (
    <div>
      {newPromo && <NewPromoBanner promo={newPromo} onDismiss={onDismissNewPromo} />}
      <Greeting customer={customer} cardCount={1 + promoCards.length} />
      <PromoCards cards={promoCards} today={today} />
      <HeroBanner />
      <SwirlDivider />
      <EarnRewardsCard onView={goToRewards} />
      <MenuStrip />
      <ProgressSection customer={customer} />
      <FollowUs />
    </div>
  );
}
