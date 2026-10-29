import { clientConfig } from "../client.config";
import { isRewardReady } from "../lib/loyalty";
import { STAMPS_FOR_REWARD } from "../loyaltySettings";
import { LoadingScreen } from "../components/LoadingScreen";
import { ScanPanel } from "./ScanPanel";
import { StaffLogin } from "./StaffLogin";
import { useOwnerCustomers } from "./useOwnerCustomers";

export function OwnerApp({ onExit }) {
  const { session, customers, loading, addStampByCode, resetStamps, signOut } = useOwnerCustomers();

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <StaffLogin onLoggedIn={() => {}} />;
  }

  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", padding: "0 0 40px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "var(--c-dark)", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--c-cream)" }}>{clientConfig.brandName} — Staff</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={signOut} style={{ background: "transparent", color: "var(--c-lilac)", border: "1px solid var(--c-lilac)", borderRadius: 999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
              <div key={c.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid var(--c-border)", borderRadius: 14, padding: "12px 16px", marginBottom: 10, maxWidth: 480, margin: "0 auto 10px" }}>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "var(--c-dark)" }}>{c.name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-faint)" }}>{c.stamps} / {STAMPS_FOR_REWARD} stamps · {c.code}</div>
                </div>
                {isRewardReady(c.stamps, STAMPS_FOR_REWARD) ? (
                  <button onClick={() => resetStamps(c.code)} style={{ background: "var(--c-gold)", color: "var(--c-dark)", border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Redeem</button>
                ) : (
                  <button onClick={() => addStampByCode(c.code)} style={{ background: "var(--c-dark)", color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Add stamp</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
