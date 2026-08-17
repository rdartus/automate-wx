import { BrowserContext, Page } from "patchright";

export async function goChapter(
    context: BrowserContext,
    url: string
): Promise<Page> {

    console.log("------------------------ Start chapter opening ------------------------------------");
    console.log(`---------Book : ${url} --------`);

    const chapterUrl = new URL(url).href;

    const page = await context.newPage();

    await page.goto(chapterUrl, { waitUntil: "domcontentloaded" });

    if (!(await waitForVip(page))) {
        console.warn("VIP button not found, reloading...");

        await page.reload({ waitUntil: "domcontentloaded" });

        if (!(await waitForVip(page))) {
            throw new Error("Account / Loading error");
        }
    }

    return page;
}

async function waitForVip(page: Page, timeout = 5000): Promise<boolean> {
    try {
        await page.getByRole("button", { name: /vip/i }).waitFor({
            state: "visible",
            timeout,
        });
        return true;
    } catch {
        return false;
    }
}

