import { expect } from "@playwright/test";
import { admin, must } from "../support/scratch.js";

// Every customer the smoke tests sign up uses a contact matching this, so
// cleanup also removes leftovers from failed runs.
export const CONTACT_PATTERN = "smoke-%@test.local";

// Removes smoke customers, plus the anonymous accounts browsers created since
// `since` (an ISO timestamp). Run the smoke and DB suites one after the other,
// not at the same time, so this never deletes the DB tests' accounts mid-run.
export async function cleanup(since) {
  must(await admin.from("customers").delete().like("contact", CONTACT_PATTERN));
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

// A card's row in the staff dashboard's customer list.
export const staffRow = (page, code) => page.getByTestId(`customer-row-${code}`);

// "<stamps> / <total> stamps · <code>" line on that row.
export const staffStampLine = (page, code) => staffRow(page, code).getByText(/stamps · /);

// The "+ Add stamp" / "Redeem" button on that row.
export const staffRowButton = (page, code) => staffRow(page, code).getByRole("button", { name: /Add stamp|Redeem/ });
