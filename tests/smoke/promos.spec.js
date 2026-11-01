// Promo cards end to end (developent-docs/promo-cards-design.md), once per
// shop, against the scratch project. A shop runs one promo at a time, so a
// promo made by hand on scratch that's running today makes this fail.
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { admin, getTenantIds, must, shopDay } from "../support/scratch.js";
import {
  cardLineButton, cardLineStamps, joinAsCustomer, openCustomer, openLoyaltyCards, removeSmokePromos, signInAsStaff, staffRowStamps,
  typeCode,
} from "./support.js";

test("staff run a promo: customers see it, staff stamp and redeem both cards, and finished cards show in past cards", async ({ browser, page }, testInfo) => {
  const slug = testInfo.project.name;
  const tenantId = (await getTenantIds())[slug];
  await removeSmokePromos(tenantId); // from a failed earlier attempt
  const run = randomBytes(2).toString("hex");
  const promoName = `Smoke Waffles ${run}`;
  const contact = `smoke-${randomBytes(3).toString("hex")}-${slug}@test.local`;

  const { defaultBrowserType, ...deviceOptions } = testInfo.project.use;
  const staffContext = await browser.newContext(deviceOptions);
  const staff = await staffContext.newPage();

  await test.step("staff create a promo that starts today", async () => {
    await signInAsStaff(staff, slug);
    await staff.getByRole("button", { name: "Promos" }).click();
    await staff.getByRole("button", { name: "New promo" }).click();
    await staff.getByPlaceholder("e.g. Waffle month").fill(promoName);
    await staff.getByRole("button", { name: "cake" }).click();
    await staff.getByRole("spinbutton").fill("2");
    await staff.getByRole("button", { name: "Save" }).click();
    await expect(staff.getByText("Running now")).toBeVisible();
    // Filtered by name: the shop may have other promos (past ones are listed too).
    await expect(staff.getByTestId("promo-line").filter({ hasText: promoName })).toBeVisible();
    await staff.getByRole("button", { name: "Customers" }).click();
  });

  let code;
  await test.step("a customer sees the new-promo banner and the promo card", async () => {
    await joinAsCustomer(page, "Smoke Promo", contact);
    code = must(await admin.from("customers").select("code").eq("contact", contact).single()).code;
    await expect(page.getByTestId("new-promo-banner")).toContainText(`New: ${promoName}!`);
    await expect(page.getByTestId("promo-card")).toContainText(promoName);
    await expect(page.getByTestId("promo-card")).toContainText("0 of 2");
    await page.getByTestId("new-promo-banner").click();
    await expect(page.getByTestId("new-promo-banner")).toBeHidden();
    await page.reload(); // dismissed for good on this phone
    await expect(page.getByTestId("promo-card")).toBeVisible();
    await expect(page.getByTestId("new-promo-banner")).toBeHidden();
  });

  await test.step("with \"Scans add to\" set to the promo, a scan stamps the promo card", async () => {
    await staff.getByRole("button", { name: promoName, exact: true }).click();
    await typeCode(staff, code);
    await expect(staff.getByText(`✓ Added a ${promoName} stamp for Smoke Promo`)).toBeVisible();
    await expect(staffRowStamps(staff, code)).toContainText(`Main 0/`);
    await expect(staffRowStamps(staff, code)).toContainText(`${promoName} 1/2`);
    await expect(page.getByTestId("promo-card")).toContainText("1 of 2");
  });

  await test.step("with \"Ask me\", a scan opens the customer view", async () => {
    await staff.getByRole("button", { name: "Ask me", exact: true }).click();
    // The scanner ignores the same code again within 4 seconds (RESCAN_COOLDOWN_MS).
    await staff.waitForTimeout(4000);
    await typeCode(staff, code);
    await expect(staff.getByTestId("customer-view")).toContainText(code);
  });

  await test.step("staff stamp both cards from the customer view and redeem the full promo card", async () => {
    await cardLineButton(staff, "Main card").click();
    await expect(cardLineStamps(staff, "Main card")).toHaveText(/^1 \/ \d+ stamps$/);
    await cardLineButton(staff, promoName).click();
    await expect(cardLineStamps(staff, promoName)).toContainText("2 / 2 stamps");
    await expect(cardLineButton(staff, promoName)).toHaveText("Redeem");
    await cardLineButton(staff, promoName).click();
    await expect(staff.getByText("✓ Reward redeemed")).toBeVisible();
    await expect(cardLineStamps(staff, promoName)).toContainText("0 / 2 stamps");
  });

  await test.step("the customer's promo card starts again, and the redeemed one is in past cards", async () => {
    await expect(page.getByTestId("promo-card")).toContainText("0 of 2");
    await openLoyaltyCards(page, "Past cards");
    await expect(page.getByTestId("past-card")).toHaveCount(1);
    await expect(page.getByTestId("past-card")).toContainText(promoName);
    await expect(page.getByTestId("past-card")).toContainText("REDEEMED");
  });

  await test.step("after a promo ends, a full card can still be claimed and an unfinished one shows as expired", async () => {
    const customerId = must(await admin.from("customers").select("id").eq("code", code).single()).id;
    const promo = async (name, from, to, stamps) => {
      const { id } = must(await admin.from("promos")
        .insert({ name, icon: "pizza", stamps_for_reward: 2, starts_on: shopDay(from), ends_on: shopDay(to), tenant_id: tenantId })
        .select().single());
      must(await admin.from("promo_stamps").insert({ customer_id: customerId, promo_id: id, stamps }));
    };
    await promo(`Smoke Ended ${run}`, -10, -1, 2); // full, in its claim window
    await promo(`Smoke Old ${run}`, -40, -30, 1); // unfinished, ended

    await page.reload();
    await openLoyaltyCards(page, "Active (3)");
    await expect(page.getByTestId("promo-card").filter({ hasText: `Smoke Ended ${run}` })).toContainText("Claim your free reward by");
    await page.getByText("Past cards").click();
    await expect(page.getByTestId("past-card")).toHaveCount(2);
    await expect(page.getByTestId("past-card").filter({ hasText: `Smoke Old ${run}` })).toContainText("EXPIRED");

    await staff.reload();
    await openCustomer(staff, code);
    await expect(cardLineStamps(staff, `Smoke Ended ${run}`)).toContainText("ended, claim by");
    await cardLineButton(staff, `Smoke Ended ${run}`).click();
    await expect(staff.getByText("✓ Reward redeemed")).toBeVisible();
    await expect(page.getByTestId("past-card")).toHaveCount(3);
  });

  await staffContext.close();
  await removeSmokePromos(tenantId);
});
