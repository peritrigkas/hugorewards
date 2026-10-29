import { ensureStaffAccount, getTenantIds } from "../support/scratch.js";
import { cleanup } from "./support.js";

export default async function globalSetup() {
  // Anonymous accounts the browsers create from now on are removed in teardown.
  process.env.SMOKE_RUN_STARTED_AT = new Date().toISOString();
  await cleanup();
  const tenants = await getTenantIds();
  for (const slug of ["hugo", "daisy"]) {
    const { email, password } = await ensureStaffAccount("smoke", slug, tenants[slug]);
    process.env[`SMOKE_STAFF_${slug.toUpperCase()}_EMAIL`] = email;
    process.env[`SMOKE_STAFF_${slug.toUpperCase()}_PASSWORD`] = password;
  }
}
