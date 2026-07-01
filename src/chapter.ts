import { BrowserContext, Page } from "playwright";

export async function goChapter(
    context: BrowserContext,
    url: string
): Promise<Page> {

    console.log("------------------------ Start chapter opening ------------------------------------");
    console.log(`---------Book : ${url} --------`);

    const page = await context.newPage();

    await page.goto(url, {
        waitUntil: "networkidle",
    });

    const vip = page.getByRole("button", {
        name: /vip/i,
    });

    if (!(await vip.isVisible().catch(() => false))) {

        console.warn("VIP button not found, reloading...");

        await page.reload({
            waitUntil: "networkidle",
        });

        if (!(await vip.isVisible().catch(() => false))) {
            throw new Error("Account / Loading error");
        }
    }

    return page;
}