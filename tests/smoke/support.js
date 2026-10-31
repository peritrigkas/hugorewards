import { expect } from "@playwright/test";
import { admin, must } from "../support/scratch.js";

// Every customer the smoke tests sign up uses a contact matching this, and
// every promo they create a name starting "Smoke ", so cleanup also removes
// leftovers from failed runs.
export const CONTACT_PATTERN = "smoke-%@test.local";
const PROMO_PATTERN = "Smoke %";

// Removes smoke promos (all shops, or one), with anyone's stamps and history
// on them: a promo with stamps can't be deleted otherwise.
export async function removeSmokePromos(tenantId) {
  let query = admin.from("promos").select("id").like("name", PROMO_PATTERN);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const ids = must(await query).map((p) => p.id);
  if (ids.length === 0) return;
  must(await admin.from("promo_stamps").delete().in("promo_id", ids));
  must(await admin.from("card_history").delete().in("promo_id", ids));
  must(await admin.from("promos").delete().in("id", ids));
}

// Removes smoke customers, plus the anonymous accounts browsers created since
// `since` (an ISO timestamp). Run the smoke and DB suites one after the other,
// not at the same time, so this never deletes the DB tests' accounts mid-run.
export async function cleanup(since) {
  must(await admin.from("customers").delete().like("contact", CONTACT_PATTERN));
  await removeSmokePromos();
  if (!since) return;
  const { users } = must(await admin.auth.admin.listUsers({ perPage: 1000 }));
  for (const user of users.filter((u) => u.is_anonymous && u.created_at >= since)) {
    must(await admin.auth.admin.deleteUser(user.id));
  }
}

// Set by global-setup.js, which runs in the parent process; workers inherit it.
const staffEnv = (slug, key) => process.env[`SMOKE_STAFF_${slug.toUpperCase()}_${key}`];

export async function signInAsStaff(page, slug) {
  await page.goto("/?owner");
  await page.getByPlaceholder("Email").fill(staffEnv(slug, "EMAIL"));
  await page.getByPlaceholder("Password").fill(staffEnv(slug, "PASSWORD"));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/— Staff$/)).toBeVisible();
}

export async function joinAsCustomer(page, name, contact) {
  await page.goto("/");
  await page.getByPlaceholder("Your name").fill(name);
  await page.getByPlaceholder("Phone or email").fill(contact);
  await page.getByRole("button", { name: /^Join / }).click();
  await expect(page.getByText(`Hey ${name.split(" ")[0]}!`)).toBeVisible();
}

// A customer's line in the staff dashboard's list; tapping it opens the
// customer view.
export const staffRow = (page, code) => page.getByTestId(`customer-row-${code}`);

// "<code> · Main <stamps>/<total>[ · <promo> <stamps>/<total>]" on that line.
export const staffRowStamps = (page, code) => staffRow(page, code).getByTestId("customer-row-stamps");

export async function openCustomer(page, code) {
  await staffRow(page, code).click();
  await expect(page.getByTestId("customer-view")).toContainText(code);
}

// A card in the open customer view ("Main card" or a promo's name): its
// "<stamps> / <total> stamps" line and its "+ Stamp" / "Redeem" button.
export const cardLine = (page, name) => page.getByTestId("card-line").filter({ hasText: name });
export const cardLineStamps = (page, name) => cardLine(page, name).getByTestId("card-line-stamps");
export const cardLineButton = (page, name) => cardLine(page, name).getByRole("button", { name: /Stamp|Redeem/ });

// Staff type (or a hardware scanner "types") a customer's code.
export async function typeCode(page, code) {
  const codeInput = page.getByPlaceholder(/Type a code/);
  await codeInput.fill(code);
  await codeInput.press("Enter");
}

// The customer's Loyalty cards screen, on the given tab.
export async function openLoyaltyCards(page, tab) {
  await page.getByTestId("nav-rewards").click();
  await page.getByText("VIEW CARDS").click();
  await page.getByText(tab).click();
}
