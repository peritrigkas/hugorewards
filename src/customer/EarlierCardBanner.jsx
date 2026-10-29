// Shown when another card in this shop has the same phone/email — most likely
// the customer's card from an old phone, which staff can move onto this one.
export function EarlierCardBanner({ code }) {
  return (
    <div style={{ margin: "16px 20px 0", background: "var(--c-lilac)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "14px 16px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--c-dark)", marginBottom: 4 }}>Looks like you already have a card with us</div>
      <div style={{ fontSize: 13, color: "var(--c-darkAlt)" }}>
        Show this screen to staff to move your stamps to this phone. Your new code: <b>{code}</b>
      </div>
    </div>
  );
}
