import React from "react";
import ReactDOM from "react-dom/client";
import { applyTenantConfig } from "./tenantConfig";

// Resolve the tenant's config from Supabase before App.jsx (and its
// client.config.js-derived module constants) ever evaluates.
applyTenantConfig().finally(() => {
  import("./App.jsx").then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
});
