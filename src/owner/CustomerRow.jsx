import { STAMPS_FOR_REWARD } from "../loyaltySettings";

// One customer in the staff list: name, code and each card's stamps. Tapping
// it opens the customer view, where staff stamp, redeem and move stamps.
// promoCards are this customer's active promo cards (see activePromoCards);
// rewardCount their rewards waiting to be claimed.
export function CustomerRow({ customer: c, promoCards, rewardCount, hasEarlierCard, onOpen }) {
  const counts = [`Main ${c.stamps}/${STAMPS_FOR_REWARD}`, ...promoCards.map(({ promo, stamps }) => `${promo.name} ${stamps}/${promo.stamps_for_reward}`)];
  return (
    <button
      data-testid={`customer-row-${c.code}`}
      onClick={onOpen}
      style={{ display: "block", width: "100%", maxWidth: 480, margin: "0 auto 8px", textAlign: "left", background: "#fff", border: "1px solid var(--c-border)", borderRadius: 14, padding: "12px 16px", fontFamily: "Inter, sans-serif", cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: "var(--c-dark)" }}>{c.name}</span>
        {rewardCount > 0 && <span data-testid="customer-row-rewards" style={{ fontSize: 11, fontWeight: 600, color: "var(--c-dark)", background: "var(--c-gold)", borderRadius: 999, padding: "2px 8px" }}>{rewardCount} to claim</span>}
        {hasEarlierCard && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-dark)", background: "var(--c-lilac)", borderRadius: 999, padding: "2px 8px" }}>Earlier card?</span>}
      </div>
      <div data-testid="customer-row-stamps" style={{ fontSize: 12, color: "var(--c-faint)", marginTop: 2 }}>
        {c.code} · {counts.join(" · ")}
      </div>
    </button>
  );
}
