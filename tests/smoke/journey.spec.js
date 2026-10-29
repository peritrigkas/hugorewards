// End-to-end smoke tests: the main customer and staff flows in a real browser,
// once per shop (Playwright project = tenant slug), against the scratch project.
// These guard the App.jsx refactor (developent-docs/refactor-plan.md).
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { admin, must } from "../support/scratch.js";
import { signInAsStaff, staffRowButton, staffStampLine } from "./support.js";

test("customer joins, gets stamped, redeems, edits, rejoins and deletes", async ({ browser, page }, testInfo) => {
  const slug = testInfo.project.name;
  const contact = `smoke-${randomBytes(3).toString("hex")}-${slug}@test.local`;
  let code;
  let stampsForReward;

  await test.step("join", async () => {
    await page.goto("/");
    await page.getByPlaceholder("Your name").fill("Smoke Tester");
    await page.getByPlaceholder("Phone or email").fill(contact);
    await page.getByRole("button", { name: /^Join / }).click();
    await expect(page.getByText("Hey Smoke!")).toBeVisible();
  });

  await test.step("scan screen shows a QR code and the card is saved under this shop", async () => {
    await page.getByTestId("nav-scan").click();
    await expect(page.getByText("Show this to staff")).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    code = await page.getByText(/^[A-Z]+-[0-9A-Z]{5}$/).textContent();
    const row = must(await admin.from("customers").select("contact, stamps, tenants(slug)").eq("code", code).single());
    expect(row).toEqual({ contact, stamps: 0, tenants: { slug } });
  });

  await test.step("edit name in the account screen", async () => {
    await page.getByTestId("open-account").click();
    await expect(page.getByText(`Your loyalty code: ${code}`)).toBeVisible();
    await page.getByRole("textbox").first().fill("Smoke Renamed");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("✓ Saved")).toBeVisible();
  });

  // Staff use their own device: a separate browser context, so the staff
  // login doesn't replace the customer's session.
  const { defaultBrowserType, ...deviceOptions } = testInfo.project.use;
  const staffContext = await browser.newContext(deviceOptions);
  const staff = await staffContext.newPage();
  const stampLine = staffStampLine(staff, code);

  await test.step("staff signs in and stamps the card by typing its code", async () => {
    await signInAsStaff(staff, slug);
    await expect(stampLine).toHaveText(/^0 \/ \d+ stamps/);
    stampsForReward = Number((await stampLine.textContent()).match(/\/ (\d+) stamps/)[1]);
    const codeInput = staff.getByPlaceholder(/Type a code/);
    await codeInput.fill(code);
    await codeInput.press("Enter");
    await expect(staff.getByText("✓ Added a stamp for Smoke Renamed")).toBeVisible();
    await expect(stampLine).toHaveText(`1 / ${stampsForReward} stamps · ${code}`);
  });

  await test.step("customer's card updates live", async () => {
    await page.getByTestId("nav-home").click();
    await expect(page.getByText(`1/${stampsForReward}`, { exact: true })).toBeVisible();
  });

  await test.step("staff fills the card and redeems the reward", async () => {
    for (let n = 2; n <= stampsForReward; n++) {
      await staffRowButton(staff, code).click();
      await expect(stampLine).toHaveText(`${n} / ${stampsForReward} stamps · ${code}`);
    }
    await expect(staffRowButton(staff, code)).toHaveText("Redeem");
    await staffRowButton(staff, code).click();
    await expect(stampLine).toHaveText(`0 / ${stampsForReward} stamps · ${code}`);
    await expect(page.getByText(`0/${stampsForReward}`, { exact: true })).toBeVisible();
  });
  await staffContext.close();

  // Uses the "find card by contact" lookup — a known hole in
  // tests/db/security.test.js, so this step changes with the anon sign-in work.
  await test.step("log out, then rejoin with the same contact to get the same card back", async () => {
    await page.getByTestId("open-account").click();
    await page.getByRole("button", { name: "Log out" }).click();
    await page.getByRole("button", { name: "Log out" }).click(); // confirm
    await page.getByPlaceholder("Your name").fill("Someone Else");
    await page.getByPlaceholder("Phone or email").fill(contact);
    await page.getByRole("button", { name: /^Join / }).click();
    await expect(page.getByText("Hey Smoke!")).toBeVisible();
    await page.getByTestId("open-account").click();
    await expect(page.getByText(`Your loyalty code: ${code}`)).toBeVisible();
  });

  await test.step("delete the account", async () => {
    await page.getByRole("button", { name: "Delete my account and data" }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    expect(must(await admin.from("customers").select("id").eq("code", code))).toEqual([]);
  });
});

test("staff scanner rejects another shop's code", async ({ page }, testInfo) => {
  const slug = testInfo.project.name;
  await signInAsStaff(page, slug);
  const codeInput = page.getByPlaceholder(/Type a code/);
  await codeInput.fill(slug === "hugo" ? "DAISY-AAAAA" : "HUGO-AAAAA");
  await codeInput.press("Enter");
  await expect(page.getByText(/doesn't look like a .+ code/)).toBeVisible();
});
