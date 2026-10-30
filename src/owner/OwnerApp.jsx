import { clientConfig } from "../client.config";
import { findEarlierCards } from "../lib/loyalty";
import { LoadingScreen } from "../components/LoadingScreen";
import { CustomerRow } from "./CustomerRow";
import { ScanPanel } from "./ScanPanel";
import { StaffLogin } from "./StaffLogin";
import { useOwnerCustomers } from "./useOwnerCustomers";

export function OwnerApp({ onExit }) {
  const { session, customerOnDevice, customers, loading, addStampByCode, resetStamps, moveCard, signOut } = useOwnerCustomers();
  const earlierCards = findEarlierCards(customers);

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <StaffLogin onLoggedIn={() => {}} customerOnDevice={customerOnDevice} />;
  }

  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", padding: "0 0 40px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "var(--c-dark)", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--c-cream)" }}>{clientConfig.brandName} — Staff</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={async () => { await signOut(); onExit?.(); }} style={{ background: "transparent", color: "var(--c-lilac)", border: "1px solid var(--c-lilac)", borderRadius: 999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
          {onExit && (
            <button onClick={onExit} style={{ background: "var(--c-border)", color: "var(--c-dark)", border: "none", borderRadius: 999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              Exit staff mode
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "24px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--c-muted)" }}>Loading…</div>
        ) : (
          <>
            <ScanPanel customers={customers} onFoundCode={addStampByCode} />
            {customers.map((c) => (
              <CustomerRow
                key={c.code}
                customer={c}
                earlierCard={earlierCards[c.id]}
                onAddStamp={addStampByCode}
                onRedeem={resetStamps}
                onMoveCard={moveCard}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
