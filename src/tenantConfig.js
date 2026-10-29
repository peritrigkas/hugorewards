import { supabase } from "./supabaseClient";
import { clientConfig } from "./client.config";

// Each per-client build (see white-label-progress.md Epic 3) is stamped with
// its own VITE_TENANT_SLUG at build time. Falls back to the bundled Hugo
// default when unset, so existing single-tenant builds and local dev keep
// working without any env changes.
const BUNDLED_ID = clientConfig.id;
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || BUNDLED_ID;
const LOGO_PRELOAD_TIMEOUT_MS = 2500;

// Resolves once the image is loaded (true) or failed/timed out (false), so
// the first screen renders with the logo already cached instead of popping in.
function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), LOGO_PRELOAD_TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

// Dev-only: preview artwork without editing the tenants row, e.g.
// http://localhost:5173/?stampIcon=scissors&stampsForReward=8&logoUrl=https://...
function applyDevPreviewParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("logoUrl")) clientConfig.logoUrl = params.get("logoUrl");
  if (params.has("mark")) clientConfig.mark = params.get("mark");
  if (params.has("stampIcon")) clientConfig.loyalty.stampIcon = params.get("stampIcon");
  if (params.has("stampsForReward")) clientConfig.loyalty.stampsForReward = Number(params.get("stampsForReward"));
}

// Mutates the shared `clientConfig` object in place (rather than replacing
// the export) so every module that already imported it — most of App.jsx —
// picks up the resolved values without needing to change how they read it.
// main.jsx awaits this, then dynamically imports App.jsx, so App's
// module-level consts derived from clientConfig (STAMPS_FOR_REWARD,
// CUSTOMER_CODE_RE, etc.) compute from the resolved tenant, not the default.
export async function applyTenantConfig() {
  await resolveTenant();
  if (import.meta.env.DEV) applyDevPreviewParams();
  if (clientConfig.logoUrl && !(await preloadImage(clientConfig.logoUrl))) {
    clientConfig.logoUrl = null; // fall back to the mark instead of a broken image
  }
}

async function resolveTenant() {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", TENANT_SLUG)
      .maybeSingle();
    if (error || !data) return;

    // loyalty/colors are pulled out first so they merge key-by-key below —
    // Object.assign would otherwise replace the bundled objects wholesale,
    // dropping every key the row doesn't restate.
    const { loyalty: loyaltyOverrides, colors: colorOverrides, ...overrides } = data.config || {};
    // Hugo's cow artwork is the bundled default; another tenant gets neutral
    // defaults unless its row picks its own (logoUrl, mark, loyalty.stampIcon).
    if (data.slug !== BUNDLED_ID) {
      clientConfig.mark = "initial";
      clientConfig.loyalty.stampIcon = "circle";
    }
    Object.assign(clientConfig, overrides, {
      id: data.slug,
      tenantId: data.id,
      brandName: data.brand_name,
      fullBrandName: data.full_brand_name,
    });
    clientConfig.loyalty = {
      ...clientConfig.loyalty,
      ...loyaltyOverrides,
      codePrefix: data.code_prefix,
    };
    clientConfig.colors = { ...clientConfig.colors, ...colorOverrides };
  } catch {
    // No tenants table yet (pre-migration), or offline — keep bundled defaults.
  }
}
