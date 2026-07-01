import { Page, BrowserContext } from "playwright";


export async function ensureLoggedIn(page: Page): Promise<void> {
    const vip = page.getByRole("button", { name: /vip/i });

    if (!(await vip.isVisible().catch(() => false))) {
        await page.reload({ waitUntil: "networkidle" });
    }
}

export async function login(
    page: Page,
    context: BrowserContext,
    siteUrl: string
) {

    console.log("------------------------Start Login------------------------------------");

    const user = process.env.USER_WX;
    const password = process.env.PASSWORD_WX;

    if (!user)
        throw new Error("USER_WX is not defined");

    if (!password)
        throw new Error("PASSWORD_WX is not defined");

    await page.goto(siteUrl, {
        waitUntil: "networkidle",
    });

    await page.getByRole("button", {
        name: /profile/i,
    }).click();

    await page.getByRole("button", {
        name: /^log\s*in$/i,
    }).click();

    await page.locator("#Username").fill(user);

    await page.locator("#Password").fill(password);

    console.log("Send Login");

    await Promise.all([
        page.waitForLoadState("networkidle"),
        page.locator("button[value='login']").click(),
    ]);

    const cookies = await context.cookies();

    console.log(cookies);

    return cookies;
}