import { Page, BrowserContext } from "playwright";

export async function checkin(page: Page, url: string) {

    await page.goto(url, {
        waitUntil: "networkidle",
    });

    if (!(await page.getByRole("button", { name: /vip/i }).count())) {
        await page.reload({
            waitUntil: "networkidle",
        });
    }

    const gotIt = page.getByRole("button", {
        name: /^got it$/i,
    });

    if (!(await gotIt.count())) {
        console.log("Already checked in.");
        return;
    }

    await gotIt.click();

    console.log("Check-in done.");
}
export async function checkout(
    page: Page,
    siteUrl: string
): Promise<void> {

    console.log("------------------------Start checkout------------------------------------");

    await page.goto(
        `${siteUrl}manage/subscriptions/daily-rewards`,
        { waitUntil: "networkidle" }
    );

    const vipButton = page.getByRole("button", {
        name: /vip/i,
    });

    if (!(await vipButton.isVisible().catch(() => false))) {
        await page.reload({
            waitUntil: "networkidle",
        });
    }

    const rewards = page.locator(
        "#app div.mx-auto > div.flex div:nth-child(2) button:not(:disabled)"
    );

    const count = await rewards.count();

    for (let i = 0; i < count; i++) {
        await rewards.nth(i).click();
    }

    console.log(`Collected ${count} reward(s).`);
}