import { supabase } from "./supabaseClient";
import { clientConfig } from "./client.config";

// Each per-client build (see white-label-progress.md Epic 3) is stamped with
// its own VITE_TENANT_SLUG at build time. Falls back to the bundled Hugo
// default when unset, so existing single-tenant builds and local dev keep
// working without any env changes.
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || clientConfig.id;

// Mutates the shared `clientConfig` object in place (rather than replacing
// the export) so every module that already imported it — most of App.jsx —
// picks up the resolved values without needing to change how they read it.
// main.jsx awaits this, then dynamically imports App.jsx, so App's
// module-level consts derived from clientConfig (STAMPS_FOR_REWARD,
// CUSTOMER_CODE_RE, etc.) compute from the resolved tenant, not the default.
export async function applyTenantConfig() {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", TENANT_SLUG)
      .maybeSingle();
    if (error || !data) return;

    const overrides = data.config || {};
    Object.assign(clientConfig, overrides, {
      id: data.slug,
      tenantId: data.id,
      brandName: data.brand_name,
      fullBrandName: data.full_brand_name,
    });
    clientConfig.loyalty = {
      ...clientConfig.loyalty,
      ...overrides.loyalty,
      codePrefix: data.code_prefix,
    };
    clientConfig.colors = { ...clientConfig.colors, ...overrides.colors };
  } catch {
    // No tenants table yet (pre-migration), or offline — keep bundled defaults.
  }
}
