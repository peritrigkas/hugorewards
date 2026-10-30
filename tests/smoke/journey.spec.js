// End-to-end smoke tests: the main customer and staff flows in a real browser,
// once per shop (Playwright project = tenant slug), against the scratch project.
// Each browser context is a separate "phone" with its own anonymous account.
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { clientConfig } from "../../src/client.config.js";
import { admin, must } from "../support/scratch.js";
import { joinAsCustomer, signInAsStaff, staffRow, staffRowButton, staffStampLine } from "./support.js";

const smokeContact = (slug) => `smoke-${randomBytes(3).toString("hex")}-${slug}@test.local`;

// A new browser context with the project's device settings — another "phone".
async function newPhone(browser, testInfo) {
  const { defaultBrowserType, ...deviceOptions } = testInfo.project.use;
  const context = await browser.newContext(deviceOptions);
  return { context, page: await context.newPage() };
}

test("customer joins, gets stamped, logs out and back in, moves to a new phone, redeems and deletes", async ({ browser, page }, testInfo) => {
  const slug = testInfo.project.name;
  const contact = smokeContact(slug);
  let code;
  let stampsForReward;

  await test.step("join", async () => {
    await joinAsCustomer(page, "Smoke Tester", contact);
  });

  await test.step("scan screen shows a QR code; the card is saved under this shop and linked to the phone's account", async () => {
    await page.getByTestId("nav-scan").click();
    await expect(page.getByText("Show this to staff")).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    code = await page.getByText(/^[A-Z]+-[0-9A-Z]{5}$/).textContent();
    const row = must(await admin.from("customers").select("contact, stamps, user_id, tenants(slug)").eq("code", code).single());
    expect(row).toMatchObject({ contact, stamps: 0, tenants: { slug } });
    expect(row.user_id).toBeTruthy();
  });

  await test.step("edit name in the account screen", async () => {
    await page.getByTestId("open-account").click();
    await expect(page.getByText(`Your loyalty code: ${code}`)).toBeVisible();
    await page.getByRole("textbox").first().fill("Smoke Renamed");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("✓ Saved")).toBeVisible();
  });

  // Staff use their own device: a separate browser context.
  const { context: staffContext, page: staff } = await newPhone(browser, testInfo);
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

  await test.step("log out and log back in on the same phone: same card, same stamps", async () => {
    await page.getByTestId("open-account").click();
    await page.getByRole("button", { name: "Log out" }).click();
    await page.getByRole("button", { name: "Log out" }).click(); // confirm
    await expect(page.getByText("You're logged out")).toBeVisible();
    await page.reload(); // still logged out after reopening the app
    await expect(page.getByText("You're logged out")).toBeVisible();
    await page.getByRole("button", { name: "Log back in" }).click();
    await expect(page.getByText(`1/${stampsForReward}`, { exact: true })).toBeVisible();
    await page.getByTestId("open-account").click();
    await expect(page.getByText(`Your loyalty code: ${code}`)).toBeVisible();
  });

  // The customer gets a new phone: a fresh install, so a fresh account.
  const { context: phone2Context, page: phone2 } = await newPhone(browser, testInfo);
  let tempCode;

  await test.step("new phone: joining with the same contact shows the already-have-a-card banner", async () => {
    await joinAsCustomer(phone2, "Smoke Newphone", contact.toUpperCase());
    await expect(phone2.getByText("Looks like you already have a card with us")).toBeVisible();
    tempCode = await phone2.locator("b").filter({ hasText: /^[A-Z]+-[0-9A-Z]{5}$/ }).textContent();
    expect(tempCode).not.toBe(code);
  });

  await test.step("staff see the possible earlier card on the new card and move it here", async () => {
    const newRow = staffRow(staff, tempCode);
    await expect(newRow.getByText("Possible earlier card:")).toContainText(`Smoke Renamed · 1 stamps · ${code}`);
    await newRow.getByRole("button", { name: "Move it here" }).click();
    await expect(staffRow(staff, tempCode)).toHaveCount(0);
    await expect(stampLine).toHaveText(`1 / ${stampsForReward} stamps · ${code}`);
  });

  await test.step("the new phone now shows the old card and its stamps", async () => {
    await expect(phone2.getByText("Looks like you already have a card with us")).toBeHidden();
    await expect(phone2.getByText(`1/${stampsForReward}`, { exact: true })).toBeVisible();
    await expect(phone2.getByText("Hey Smoke!")).toBeVisible();
    await phone2.getByTestId("open-account").click();
    await expect(phone2.getByText(`Your loyalty code: ${code}`)).toBeVisible();
    await phone2.getByTestId("nav-home").click();
  });

  await test.step("the old phone no longer has the card", async () => {
    await page.reload();
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
  });

  await test.step("staff fill the card and redeem the reward", async () => {
    for (let n = 2; n <= stampsForReward; n++) {
      await staffRowButton(staff, code).click();
      await expect(stampLine).toHaveText(`${n} / ${stampsForReward} stamps · ${code}`);
    }
    await expect(staffRowButton(staff, code)).toHaveText("Redeem");
    await staffRowButton(staff, code).click();
    await expect(stampLine).toHaveText(`0 / ${stampsForReward} stamps · ${code}`);
    await expect(phone2.getByText(`0/${stampsForReward}`, { exact: true })).toBeVisible();
  });
  await staffContext.close();

  await test.step("delete the account", async () => {
    await phone2.getByTestId("open-account").click();
    await phone2.getByRole("button", { name: "Delete my account and data" }).click();
    await phone2.getByRole("button", { name: "Delete permanently" }).click();
    await expect(phone2.getByPlaceholder("Your name")).toBeVisible();
    expect(must(await admin.from("customers").select("id").eq("code", code))).toEqual([]);
  });
  await phone2Context.close();
});

test("seven taps on the shop name open the staff PIN, which leads to staff sign-in", async ({ page }, testInfo) => {
  await joinAsCustomer(page, "Smoke Tapper", smokeContact(testInfo.project.name));

  const title = page.getByTestId("brand-title");
  for (let i = 0; i < 6; i++) await title.click();
  await expect(page.getByText("Staff access")).toBeHidden();
  await title.click();
  await expect(page.getByText("Staff access")).toBeVisible();

  const pin = page.locator('input[type="password"]');
  await pin.fill("0000");
  await pin.press("Enter");
  await expect(page.getByText("Staff access")).toBeVisible();
  await pin.fill(clientConfig.staffPin);
  await pin.press("Enter");
  await expect(page.getByText("Staff sign in")).toBeVisible();
  // This phone has a customer card, so staff sign-in warns it will be replaced.
  await expect(page.getByText("This device has a customer card.")).toBeVisible();
});

test("a device signed in as staff shows a notice instead of customer screens", async ({ page }, testInfo) => {
  await signInAsStaff(page, testInfo.project.name);
  await page.getByRole("button", { name: "Exit staff mode" }).click();
  await expect(page.getByText("Signed in as staff")).toBeVisible();
  await page.getByRole("button", { name: "Sign out of staff" }).click();
  await expect(page.getByPlaceholder("Your name")).toBeVisible();
});

test("staff scanner rejects another shop's code", async ({ page }, testInfo) => {
  const slug = testInfo.project.name;
  await signInAsStaff(page, slug);
  const codeInput = page.getByPlaceholder(/Type a code/);
  await codeInput.fill(slug === "hugo" ? "DAISY-AAAAA" : "HUGO-AAAAA");
  await codeInput.press("Enter");
  await expect(page.getByText(/doesn't look like a .+ code/)).toBeVisible();
});

test("joining shows an error when the bot check can't load", async ({ page }, testInfo) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.goto("/");
  await page.getByPlaceholder("Your name").fill("Smoke Blocked");
  await page.getByPlaceholder("Phone or email").fill(smokeContact(testInfo.project.name));
  await page.getByRole("button", { name: /^Join / }).click();
  await expect(page.getByText("Couldn't join right now")).toBeVisible();
});
