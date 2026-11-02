// Birthday treat end to end (developent-docs/birthday-treat-design.md), once
// per shop, against the scratch project.
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { MONTHS } from "../../src/lib/birthday.js";
import { admin, must, shopDay } from "../support/scratch.js";
import { joinAsCustomer, signInAsStaff, staffRow, typeCode } from "./support.js";

const monthDay = (offset) => shopDay(offset).split("-").slice(1).map(Number);

async function chooseBirthday(page, [month, day]) {
  await page.getByLabel("Birthday month").selectOption(String(month));
  await page.getByLabel("Birthday day").selectOption(String(day));
}

async function openGifts(page) {
  await page.getByTestId("nav-rewards").click();
  await page.getByText("VIEW GIFT LIST").click();
}

test("customer adds their birthday, changes it once and it locks; staff are reminded on scan and redeem the treat", async ({ browser, page }, testInfo) => {
  const slug = testInfo.project.name;
  const contact = `smoke-${randomBytes(3).toString("hex")}-${slug}@test.local`;
  await joinAsCustomer(page, "Smoke Birthday", contact);
  const code = must(await admin.from("customers").select("code").eq("contact", contact).single()).code;

  await test.step("My Gifts asks for a birthday", async () => {
    await openGifts(page);
    await expect(page.getByText("Add your birthday in My Account")).toBeVisible();
  });

  await test.step("save a birthday, then change it once: it locks", async () => {
    await page.getByText("Add your birthday in My Account").click();
    await chooseBirthday(page, monthDay(10));
    await page.getByRole("button", { name: "Save birthday" }).click();
    await expect(page.getByTestId("birthday-message")).toHaveText("✓ Birthday saved");

    const [month, day] = monthDay(0);
    await chooseBirthday(page, [month, day]);
    await page.getByRole("button", { name: "Save and lock birthday" }).click();
    await expect(page.getByTestId("birthday-locked")).toHaveText(`🔒 ${day} ${MONTHS[month - 1]}`);
  });

  await test.step("it's their birthday week: Home and My Gifts say the treat is ready", async () => {
    await page.getByTestId("nav-home").click();
    await expect(page.getByTestId("birthday-banner")).toContainText("Happy birthday!");
    await page.getByTestId("birthday-banner").click();
    await expect(page.getByTestId("birthday-treat-status")).toContainText("Your treat is ready until");
  });

  const { defaultBrowserType, ...deviceOptions } = testInfo.project.use;
  const staffContext = await browser.newContext(deviceOptions);
  const staff = await staffContext.newPage();

  await test.step("staff see the badge; a scan stamps and opens the customer with a reminder", async () => {
    await signInAsStaff(staff, slug);
    await expect(staffRow(staff, code).getByTestId("customer-row-birthday")).toBeVisible();
    await typeCode(staff, code);
    await expect(staff.getByTestId("customer-view-message")).toContainText("It's their birthday week");
  });

  await test.step("staff redeem the treat; the customer sees it was enjoyed", async () => {
    await staff.getByTestId("birthday-redeem").click();
    await expect(staff.getByTestId("customer-view-message")).toHaveText(/^✓ .+ redeemed$/);
    await expect(staff.getByTestId("birthday-box")).toContainText("Birthday treat given this year");
    await expect(page.getByTestId("birthday-treat-status")).toContainText("Enjoyed this year");
  });

  await staffContext.close();
});
