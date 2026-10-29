import { expect } from "@playwright/test";
import { admin, must } from "../support/scratch.js";

// Every customer the smoke tests sign up uses a contact matching this, so
// cleanup also removes leftovers from failed runs.
export const CONTACT_PATTERN = "smoke-%@test.local";

export async function cleanup() {
  must(await admin.from("customers").delete().like("contact", CONTACT_PATTERN));
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

// "<stamps> / <total> stamps · <code>" line in the staff dashboard's customer list.
export const staffStampLine = (page, code) => page.getByText(new RegExp(`stamps · ${code}$`));

// The "+ Add stamp" / "Redeem" button on that customer's row.
export const staffRowButton = (page, code) => staffStampLine(page, code).locator("xpath=../..").getByRole("button");
