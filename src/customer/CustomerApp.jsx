import { useState } from "react";
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
import { LoggedOutScreen, StaffOnDeviceScreen } from "./screens/DeviceScreens";
import { EarlierCardBanner } from "./EarlierCardBanner";
import { useCustomer } from "./useCustomer";
import { useSecretTap } from "./useSecretTap";

export function CustomerApp({ onStaffAccess }) {
  const {
    customer, loading, loggedOut, staffOnDevice, hasEarlierCard,
    join, saveDetails, logout, logBackIn, deleteAccount, signOutStaffOnDevice,
  } = useCustomer();
  const [screen, setScreen] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const handleSecretTap = useSecretTap(() => setShowPinPrompt(true));

  const handleLogout = () => {
    logout();
    setScreen("home");
  };

  const handleDeleteAccount = async () => {
    const deleted = await deleteAccount();
    if (deleted) setScreen("home");
    return deleted;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (staffOnDevice) {
    return <StaffOnDeviceScreen onSignOut={signOutStaffOnDevice} onOpenStaff={onStaffAccess} />;
  }

  if (!customer) {
    return <JoinScreen onJoin={join} />;
  }

  if (loggedOut) {
    return <LoggedOutScreen onLogBackIn={logBackIn} />;
  }

  const subScreen = screen === "cards" || screen === "gifts" || screen === "account";
  const handleBack = () => {
    if (screen === "cards" || screen === "gifts") setScreen("rewards");
    else setScreen("home");
  };

  return (
    <div style={{ background: "var(--c-cream)", minHeight: "100vh", maxWidth: 420, margin: "0 auto", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <TopBar onBack={subScreen ? handleBack : null} onMenu={() => setDrawerOpen(true)} onSecretTap={handleSecretTap} onAccount={() => setScreen("account")} />
      {hasEarlierCard && <EarlierCardBanner code={customer.code} />}
      {screen === "home" && <HomeScreen customer={customer} goToRewards={() => setScreen("rewards")} />}
      {screen === "rewards" && <RewardsHome goToCards={() => setScreen("cards")} goToGifts={() => setScreen("gifts")} />}
      {screen === "cards" && <LoyaltyCardDetail customer={customer} />}
      {screen === "gifts" && <GiftsView />}
      {screen === "scan" && <ScanCodeScreen customer={customer} />}
      {screen === "menu" && <MenuScreen />}
      {screen === "visit" && <VisitScreen />}
      {screen === "account" && <AccountScreen customer={customer} onSave={saveDetails} onLogout={handleLogout} onDelete={handleDeleteAccount} />}
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
