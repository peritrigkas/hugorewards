import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { isRewardReady } from "../lib/loyalty";
import { claimUntil, formatDay, isPromoCardFull } from "../lib/promos";
import { STAMPS_FOR_REWARD } from "../loyaltySettings";

// "25 May 2027"
const formatDate = (iso) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

const pill = { border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 };
const box = { background: "#fff", border: "1px solid var(--c-border)", borderRadius: 14, padding: "12px 16px", marginBottom: 10 };

// One card in the customer view: its stamps and either "+ Stamp" or "Redeem".
// A full card that can still be stamped also gets "+ Stamp", for a customer
// who'd rather keep the reward for later: the stamp moves the full card to
// their waiting rewards and starts a new one.
function CardLine({ name, stamps, stampsForReward, note, full, canStamp, busy, onStamp, onRedeem }) {
  return (
    <div data-testid="card-line" style={{ ...box, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--c-dark)" }}>{name}</div>
        <div data-testid="card-line-stamps" style={{ fontSize: 12, color: "var(--c-faint)" }}>
          {stamps} / {stampsForReward} stamps{note && ` · ${note}`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {full && canStamp && (
          <button data-testid="card-line-keep" disabled={busy} onClick={onStamp} style={{ ...pill, background: "var(--c-border)", color: "var(--c-dark)" }}>+ Stamp, keep reward</button>
        )}
        {full ? (
          <button data-testid="card-line-action" disabled={busy} onClick={onRedeem} style={{ ...pill, background: "var(--c-gold)", color: "var(--c-dark)" }}>Redeem</button>
        ) : canStamp ? (
          <button data-testid="card-line-action" disabled={busy} onClick={onStamp} style={{ ...pill, background: "var(--c-dark)", color: "#fff" }}>+ Stamp</button>
        ) : null}
      </div>
    </div>
  );
}

// Everything staff do for one customer: opened by scanning their code, typing
// it, or tapping them in the list. Shows rewards waiting to be claimed, the
// main card and any active promo card, the "possible earlier card" hint, and
// Move stamps. Moving always keeps
// the card on the customer's phone now, adds the other card's stamps to it
// and removes the other card.
export function CustomerView({ customer: c, promoCards, rewards, earlierCard, onBack, onStamp, onRedeem, onRedeemWaiting, onMoveCard }) {
  const [moving, setMoving] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const run = async (action) => {
    setBusy(true);
    setMessage("");
    const result = await action();
    setBusy(false);
    return result;
  };

  const stamp = async (promo) => {
    const result = await run(() => onStamp(c, promo));
    setMessage(result.message);
  };

  const redeem = async (promo) => {
    const error = await run(() => onRedeem(c, promo));
    setMessage(error ?? "✓ Reward redeemed");
  };

  const redeemWaiting = async (reward) => {
    const error = await run(() => onRedeemWaiting(reward));
    setMessage(error ?? "✓ Reward redeemed");
  };

  const move = async (oldCode, targetCode) => {
    const error = await run(() => onMoveCard(oldCode, targetCode.trim().toUpperCase()));
    if (error) {
      setMessage(error);
    } else {
      setMoving(false);
      setNewCode("");
    }
  };

  return (
    <div data-testid="customer-view" style={{ maxWidth: 480, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button aria-label="Back" onClick={onBack} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={24} color="var(--c-dark)" />
        </button>
        <div style={{ flex: 1, fontFamily: "Baloo 2, sans-serif", fontWeight: 700, fontSize: 22, color: "var(--c-dark)" }}>{c.name}</div>
        <div style={{ fontSize: 13, color: "var(--c-faint)" }}>{c.code}</div>
      </div>

      {rewards.length > 0 && (
        <div data-testid="waiting-rewards" style={{ ...box, background: "var(--c-lilac)" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--c-dark)", marginBottom: 6 }}>
            🎁 {rewards.length === 1 ? "A reward is" : `${rewards.length} rewards are`} waiting. Remind them before they pay!
          </div>
          {rewards.map((r) => (
            <div key={r.id} data-testid="waiting-reward" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
              <div style={{ fontSize: 12, color: "var(--c-dark)" }}>
                <b>{r.promo_id ? r.card_name : "Main card"}</b> · claim by {formatDate(r.claim_by)}
              </div>
              <button disabled={busy} onClick={() => redeemWaiting(r)} style={{ ...pill, background: "var(--c-gold)", color: "var(--c-dark)" }}>Redeem</button>
            </div>
          ))}
        </div>
      )}

      <CardLine
        name="Main card"
        stamps={c.stamps}
        stampsForReward={STAMPS_FOR_REWARD}
        full={isRewardReady(c.stamps, STAMPS_FOR_REWARD)}
        canStamp
        busy={busy}
        onStamp={() => stamp(null)}
        onRedeem={() => redeem(null)}
      />
      {promoCards.map(({ promo, stamps, phase }) => (
        <CardLine
          key={promo.id}
          name={promo.name}
          stamps={stamps}
          stampsForReward={promo.stamps_for_reward}
          note={phase === "claim" ? `ended, claim by ${formatDay(claimUntil(promo))}` : `ends ${formatDay(promo.ends_on)}`}
          full={isPromoCardFull(promo, stamps)}
          canStamp={phase === "running"}
          busy={busy}
          onStamp={() => stamp(promo)}
          onRedeem={() => redeem(promo)}
        />
      ))}

      {message && <div data-testid="customer-view-message" style={{ margin: "4px 0 12px", fontSize: 13, fontWeight: 600, color: message.startsWith("✓") ? "var(--c-dark)" : "var(--c-error)" }}>{message}</div>}

      {earlierCard && (
        <div style={{ ...box, background: "var(--c-lilac)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--c-dark)" }}>
            Possible earlier card: <b>{earlierCard.name}</b> · {earlierCard.stamps} stamps · {earlierCard.code}
          </div>
          <button disabled={busy} onClick={() => move(earlierCard.code, c.code)} style={{ ...pill, background: "var(--c-dark)", color: "#fff" }}>
            Add its stamps here
          </button>
        </div>
      )}

      <button onClick={() => setMoving(!moving)} style={{ ...pill, background: "var(--c-border)", color: "var(--c-dark)" }}>Move stamps</button>
      {moving && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "var(--c-muted)", marginBottom: 6 }}>
            Add this card's stamps to the customer's new card, then remove this one: type the code of the card they just joined with.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newCode) move(c.code, newCode); }}
              placeholder="New card's code"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 13 }}
            />
            <button disabled={!newCode || busy} onClick={() => move(c.code, newCode)} style={{ ...pill, background: "var(--c-gold)", color: "var(--c-dark)" }}>
              {busy ? "Moving…" : "Move stamps"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
