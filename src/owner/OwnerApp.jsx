import { useState } from "react";
import { clientConfig } from "../client.config";
import { findEarlierCards, isRewardReady } from "../lib/loyalty";
import { activePromoCards, isPromoCardFull, runningPromo, scanTarget, shopToday, waitingRewards } from "../lib/promos";
import { getScanSetting, setScanSetting } from "../lib/scanSetting";
import { STAMPS_FOR_REWARD } from "../loyaltySettings";
import { LoadingScreen } from "../components/LoadingScreen";
import { CustomerRow } from "./CustomerRow";
import { CustomerView } from "./CustomerView";
import { PromoPage } from "./PromoPage";
import { ScanPanel } from "./ScanPanel";
import { StaffLogin } from "./StaffLogin";
import { useOwnerCustomers } from "./useOwnerCustomers";

const headerButton = { borderRadius: 999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" };

// While a promo runs, where a scanned code's stamp goes.
function ScanSwitch({ promo, setting, onChange }) {
  const options = [["main", "Main card"], ["promo", promo.name], ["ask", "Ask me"]];
  return (
    <div style={{ maxWidth: 480, margin: "0 auto 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontFamily: "Inter, sans-serif" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Scans add to:</span>
      {options.map(([value, label]) => (
        <button key={value} aria-pressed={setting === value} onClick={() => onChange(value)} style={{ border: "none", borderRadius: 999, padding: "6px 12px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", background: setting === value ? "var(--c-dark)" : "var(--c-border)", color: setting === value ? "#fff" : "var(--c-dark)" }}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function OwnerApp({ onExit }) {
  const { session, customerOnDevice, customers, cards, loading, stamp, redeem, redeemWaiting, moveCard, savePromo, deletePromo, signOut } = useOwnerCustomers();
  const [page, setPage] = useState("customers");
  const [openCode, setOpenCode] = useState(null);
  // Shown in the customer view when a scan opened it after stamping.
  const [scanMessage, setScanMessage] = useState("");
  const [scanSetting, setScanSettingState] = useState(getScanSetting);
  const earlierCards = findEarlierCards(customers);
  const today = shopToday(clientConfig.timezone);
  const promo = runningPromo(cards.promos, today);

  const stampsByCustomer = {};
  for (const s of cards.promoStamps) (stampsByCustomer[s.customer_id] ??= {})[s.promo_id] = s.stamps;
  const promoCardsOf = (c) => activePromoCards(cards.promos, stampsByCustomer[c.id] ?? {}, today);
  const rewards = waitingRewards(cards.history);
  const rewardsOf = (c) => rewards.filter((h) => h.customer_id === c.id);

  const changeScanSetting = (setting) => {
    setScanSetting(setting);
    setScanSettingState(setting);
  };

  // A scan stamps the chosen card straight away, as before promos; on a full
  // card that keeps the reward waiting and starts a new card. It opens the
  // customer view instead when staff asked for that. When the customer then
  // has a reward waiting, it also opens the view after stamping, so staff can
  // remind them before they pay (and redeem it there).
  const handleScan = async (code) => {
    const customer = customers.find((c) => c.code === code);
    if (!customer) return { message: "No customer found for that code" };
    const target = scanTarget(scanSetting, promo);
    const full = target.kind === "promo"
      ? isPromoCardFull(promo, stampsByCustomer[customer.id]?.[promo.id] ?? 0)
      : isRewardReady(customer.stamps, STAMPS_FOR_REWARD);
    if (target.kind === "ask") {
      setScanMessage("");
      setOpenCode(code);
      return { message: "" };
    }
    const result = await stamp(customer, target.kind === "promo" ? promo : null);
    if (result.ok && (full || rewardsOf(customer).length > 0)) {
      setScanMessage(full ? `${result.message}. Their full card is now a reward waiting` : result.message);
      setOpenCode(code);
    }
    return result;
  };

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <StaffLogin onLoggedIn={() => {}} customerOnDevice={customerOnDevice} />;
  }

  // The view closes by itself if the card goes (e.g. its stamps were moved).
  const openCustomer = openCode && customers.find((c) => c.code === openCode);

  let body;
  if (loading) {
    body = <div style={{ textAlign: "center", color: "var(--c-muted)" }}>Loading…</div>;
  } else if (page === "promos") {
    body = <PromoPage promos={cards.promos} promoStamps={cards.promoStamps} history={cards.history} today={today} onSave={savePromo} onDelete={deletePromo} onBack={() => setPage("customers")} />;
  } else if (openCustomer) {
    body = (
      <CustomerView
        customer={openCustomer}
        promoCards={promoCardsOf(openCustomer)}
        rewards={rewardsOf(openCustomer)}
        initialMessage={scanMessage}
        earlierCard={earlierCards[openCustomer.id]}
        onBack={() => { setOpenCode(null); setScanMessage(""); }}
        onStamp={stamp}
        onRedeem={redeem}
        onRedeemWaiting={redeemWaiting}
        onMoveCard={moveCard}
      />
    );
  } else {
    body = (
      <>
        {promo && <ScanSwitch promo={promo} setting={scanSetting} onChange={changeScanSetting} />}
        <ScanPanel onFoundCode={handleScan} />
        {customers.map((c) => (
          <CustomerRow key={c.code} customer={c} promoCards={promoCardsOf(c)} rewardCount={rewardsOf(c).length} hasEarlierCard={Boolean(earlierCards[c.id])} onOpen={() => { setScanMessage(""); setOpenCode(c.code); }} />
        ))}
      </>
    );
  }

  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", padding: "0 0 40px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "var(--c-dark)", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--c-cream)" }}>{clientConfig.brandName} — Staff</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setPage(page === "promos" ? "customers" : "promos"); setOpenCode(null); }} style={{ ...headerButton, background: "var(--c-gold)", color: "var(--c-dark)", border: "none" }}>
            {page === "promos" ? "Customers" : "Promos"}
          </button>
          <button onClick={async () => { await signOut(); onExit?.(); }} style={{ ...headerButton, background: "transparent", color: "var(--c-lilac)", border: "1px solid var(--c-lilac)" }}>
            Sign out
          </button>
          {onExit && (
            <button onClick={onExit} style={{ ...headerButton, background: "var(--c-border)", color: "var(--c-dark)", border: "none" }}>
              Exit staff mode
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "24px 20px" }}>{body}</div>
    </div>
  );
}
