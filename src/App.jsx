// Root: applies the tenant's colours and picks the customer app or the staff
// (owner) dashboard. Screens live in customer/ and owner/, shared pieces in
// components/, and all database/storage access in lib/.
//
// main.jsx imports this file only after applyTenantConfig() has resolved the
// tenant, so modules under it may read clientConfig at import time.
import { useEffect, useState } from "react";
import { clientConfig } from "./client.config";
import { getDeviceSession, isStaffSession } from "./lib/customerAuth";
import { CustomerApp } from "./customer/CustomerApp";
import { OwnerApp } from "./owner/OwnerApp";

function ThemeVars() {
  const c = clientConfig.colors;
  const vars = Object.entries(c).map(([key, value]) => `--c-${key}: ${value};`).join(" ");
  return <style>{`:root { ${vars} }`}</style>;
}

export default function App() {
  const queryOwner = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("owner");
  const [ownerMode, setOwnerMode] = useState(queryOwner);
  // Reopening the app while staff are signed in goes straight back to the dashboard.
  useEffect(() => {
    getDeviceSession().then((session) => {
      if (isStaffSession(session)) setOwnerMode(true);
    });
  }, []);
  return (
    <>
      <ThemeVars />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      {ownerMode ? (
        <OwnerApp onExit={() => setOwnerMode(false)} />
      ) : (
        <CustomerApp onStaffAccess={() => setOwnerMode(true)} />
      )}
    </>
  );
}
