import { useState, useEffect, useRef } from "react";
import { clientConfig } from "../client.config";
import {
  createCustomer, deleteCustomer, findCustomerByContact, getCustomerByCode, subscribeToCustomer,
  updateCustomerDetails,
} from "../lib/customers";
import { makeCustomerCode } from "../lib/loyalty";
import { clearSavedCode, getSavedCode, saveCode } from "../lib/savedCode";
import { LoadingScreen } from "../components/LoadingScreen";
import { TopBar, DrawerMenu, BottomNav } from "./Navigation";
import { PinPrompt } from "./PinPrompt";
import { JoinScreen } from "./screens/JoinScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { RewardsHome, LoyaltyCardDetail, GiftsView } from "./screens/RewardsScreens";
import { ScanCodeScreen } from "./screens/ScanCodeScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { VisitScreen } from "./screens/VisitScreen";
import { AccountScreen } from "./screens/AccountScreen";

export function CustomerApp({ onStaffAccess }) {
  const [screen, setScreen] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const handleSecretTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      setShowPinPrompt(true);
    }
  };

  const fetchMe = async (code) => {
    const data = await getCustomerByCode(code);
    if (data) setCustomer(data);
  };

  useEffect(() => {
    const savedCode = getSavedCode();
    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000));
    if (savedCode) {
      Promise.all([fetchMe(savedCode), minDelay]).finally(() => setLoading(false));
    } else {
      minDelay.then(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (!customer) return;
    return subscribeToCustomer(customer.code, setCustomer);
  }, [customer?.code]);

  const handleJoin = async (name, contact) => {
    // Returning customer: if this contact already has a card, log them back into
    // it instead of creating a duplicate — fixes losing stamps on logout/rejoin.
    if (contact) {
      const existing = await findCustomerByContact(contact);
      if (existing) {
        saveCode(existing.code);
        setCustomer(existing);
        return true;
      }
    }
    const code = makeCustomerCode(clientConfig.loyalty.codePrefix);
    const data = await createCustomer({ name, contact, code, tenantId: clientConfig.tenantId });
    if (!data) return false;
    saveCode(code);
    setCustomer(data);
    return true;
  };

  const handleSaveAccount = async (name, contact) => {
    const data = await updateCustomerDetails(customer.code, { name, contact });
    if (!data) return false;
    setCustomer(data);
    return true;
  };

  const handleLogout = () => {
    clearSavedCode();
    setCustomer(null);
    setScreen("home");
  };

  const handleDeleteAccount = async () => {
    const deleted = await deleteCustomer(customer.code);
    if (!deleted) {
      return false;
    }
    clearSavedCode();
    setCustomer(null);
    setScreen("home");
    return true;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!customer) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  const subScreen = screen === "cards" || screen === "gifts" || screen === "account";
  const handleBack = () => {
    if (screen === "cards" || screen === "gifts") setScreen("rewards");
    else setScreen("home");
  };

  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", maxWidth: 420, margin: "0 auto", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <TopBar onBack={subScreen ? handleBack : null} onMenu={() => setDrawerOpen(true)} onSecretTap={handleSecretTap} onAccount={() => setScreen("account")} />
      {screen === "home" && <HomeScreen customer={customer} goToRewards={() => setScreen("rewards")} />}
      {screen === "rewards" && <RewardsHome goToCards={() => setScreen("cards")} goToGifts={() => setScreen("gifts")} />}
      {screen === "cards" && <LoyaltyCardDetail customer={customer} />}
      {screen === "gifts" && <GiftsView />}
      {screen === "scan" && <ScanCodeScreen customer={customer} />}
      {screen === "menu" && <MenuScreen />}
      {screen === "visit" && <VisitScreen />}
      {screen === "account" && <AccountScreen customer={customer} onSave={handleSaveAccount} onLogout={handleLogout} onDelete={handleDeleteAccount} />}
      <BottomNav screen={screen} navigate={setScreen} />
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} navigate={setScreen} />
      {showPinPrompt && (
        <PinPrompt
          onSubmit={() => { setShowPinPrompt(false); onStaffAccess(); }}
          onCancel={() => setShowPinPrompt(false)}
        />
      )}
    </div>
  );
}
