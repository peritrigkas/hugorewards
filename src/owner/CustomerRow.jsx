import { useState } from "react";
import { isRewardReady } from "../lib/loyalty";
import { STAMPS_FOR_REWARD } from "../loyaltySettings";

const pill = { border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" };

// One card in the staff list. earlierCard is an older card with the same
// contact (likely this customer's old phone), whose stamps staff can add here.
// Moving always keeps the target card (the one on the customer's phone now),
// adds the other card's stamps to it and removes the other card.
export function CustomerRow({ customer: c, earlierCard, onAddStamp, onRedeem, onMoveCard }) {
  const [moving, setMoving] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const move = async (oldCode, targetCode) => {
    setBusy(true);
    setMessage("");
    const error = await onMoveCard(oldCode, targetCode.trim().toUpperCase());
    setBusy(false);
    if (error) {
      setMessage(error);
    } else {
      setMoving(false);
      setNewCode("");
    }
  };

  return (
    <div data-testid={`customer-row-${c.code}`} style={{ background: "#fff", border: "1px solid var(--c-border)", borderRadius: 14, padding: "12px 16px", maxWidth: 480, margin: "0 auto 10px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "var(--c-dark)" }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "var(--c-faint)" }}>{c.stamps} / {STAMPS_FOR_REWARD} stamps · {c.code}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setMoving(!moving)} style={{ ...pill, background: "var(--c-border)", color: "var(--c-dark)" }}>Move stamps</button>
          {isRewardReady(c.stamps, STAMPS_FOR_REWARD) ? (
            <button onClick={() => onRedeem(c.code)} style={{ ...pill, background: "var(--c-gold)", color: "var(--c-dark)" }}>Redeem</button>
          ) : (
            <button onClick={() => onAddStamp(c.code)} style={{ ...pill, background: "var(--c-dark)", color: "#fff" }}>+ Add stamp</button>
          )}
        </div>
      </div>

      {earlierCard && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--c-lilac)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--c-dark)" }}>
            Possible earlier card: <b>{earlierCard.name}</b> · {earlierCard.stamps} stamps · {earlierCard.code}
          </div>
          <button disabled={busy} onClick={() => move(earlierCard.code, c.code)} style={{ ...pill, background: "var(--c-dark)", color: "#fff", flexShrink: 0 }}>
            Add its stamps here
          </button>
        </div>
      )}

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

      {message && <div style={{ marginTop: 8, fontSize: 12, color: "var(--c-error)", fontWeight: 600 }}>{message}</div>}
    </div>
  );
}
