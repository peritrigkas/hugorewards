import { useState } from "react";
import { clientConfig } from "../../client.config";
import { BrandMark } from "../../components/BrandMark";

function CenteredMessage({ title, body, actionLabel, busyLabel, onAction, secondaryLabel, onSecondary }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <BrandMark size={72} style={{ margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 26, color: "var(--c-dark)", marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--c-muted)", marginBottom: 24 }}>{body}</div>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onAction();
            setBusy(false);
          }}
          style={{ width: "100%", background: busy ? "var(--c-lilac)" : "var(--c-dark)", color: "var(--c-cream)", border: "none", padding: "14px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, cursor: busy ? "not-allowed" : "pointer" }}
        >
          {busy ? busyLabel : actionLabel}
        </button>
        {secondaryLabel && (
          <button
            disabled={busy}
            onClick={onSecondary}
            style={{ width: "100%", marginTop: 10, background: "transparent", color: "var(--c-dark)", border: "1px solid var(--c-dark)", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, cursor: busy ? "not-allowed" : "pointer" }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// "Log out" only hides the card on this phone; this brings it straight back.
export function LoggedOutScreen({ onLogBackIn }) {
  return (
    <CenteredMessage
      title="You're logged out"
      body={`Your ${clientConfig.brandName} card and stamps are still saved on this phone.`}
      actionLabel="Log back in"
      busyLabel="Opening…"
      onAction={onLogBackIn}
    />
  );
}

// A device holds one login at a time, so customer screens can't run while
// staff are signed in here. Signing out brings back this phone's own card.
export function StaffOnDeviceScreen({ onSignOut, onOpenStaff }) {
  return (
    <CenteredMessage
      title="Signed in as staff"
      body="This device is signed in to the staff dashboard. Sign out of staff to use your customer card here."
      actionLabel="Sign out of staff"
      busyLabel="Signing out…"
      onAction={onSignOut}
      secondaryLabel="Back to staff dashboard"
      onSecondary={onOpenStaff}
    />
  );
}
