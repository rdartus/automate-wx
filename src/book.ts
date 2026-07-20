import { BrowserContext, Page } from "playwright";
import { goChapter } from "./chapter.js";
import { ensureLoggedIn } from "./auth.js";

export async function goBook(
    context: BrowserContext,
    page: Page,
    url: string
): Promise<void> {

    console.log(`--------- Book : ${url} --------`);

    await page.goto(url, {
        waitUntil: "networkidle",
    });

    await ensureLoggedIn(page);

    const statusTexts = page.locator(
        "div span[role='status'] ~ span div[class*=text]"
    );

    const statusCount = await statusTexts.count();

    let freeCount = 0;
    let timer: string | undefined;

    for (let i = 0; i < statusCount; i++) {
        const text = (await statusTexts.nth(i).textContent())?.trim() ?? "";

        // Livre entièrement gratuit
        if (/^free for all chapters$/i.test(text)) {
            console.log("Book is free, skip.");
            return;
        }

        // "1 free chapter" ou "X free chapters"
        const freeMatch = text.match(/^(\d+)\s+free chapters?$/i);

        if (freeMatch) {
            freeCount = Number(freeMatch[1]);
            continue;
        }

        // Timer du type "20:58:10"
        if (/^\d{2}:\d{2}:\d{2}$/.test(text)) {
            timer = text;
        }
    }

    if (freeCount < 1) {
        console.log("No free chapters. Skip.");
        return;
    }

    console.log(`${freeCount} free chapter${freeCount > 1 ? "s" : ""} available.`);

    if (timer && timer !== "23:00:00") {
        console.log(`Next free chapter: ${timer}`);
        return;
    }

    await page.getByRole("tab", {
        name: /chapters/i,
    }).click();

    const books = page.locator("#novel-tabs h3");
    const bookCount = await books.count();
    for (let i = 0; i < bookCount; i++) {
        await books.nth(i).click();
    }
    // Attendre la fin des éventuelles requêtes déclenchées
    await page.waitForLoadState("networkidle").catch(() => { });

    // Tous les chapitres
    const chapters = page.locator(
        'div[role="tabpanel"] div:has(> h3) a'
    );

    await chapters.first().waitFor({
        state: "visible",
        timeout: 1000,
    });

    const totalChapters = await chapters.count();

    // Chapitres possédés
    const ownedChapters = chapters.filter({
        hasText: /owned/i,
    });

    const ownedCount = await ownedChapters.count();

    if (ownedCount === totalChapters) {
        console.log(
            `Book fully owned (${ownedCount}/${totalChapters}). Skip.`
        );
        return;
    }

    console.log(
        `${ownedCount}/${totalChapters} chapters already owned - opening free chapters...`
    );

    // Chapitres gratuits à récupérer
    const waitChapters = chapters.filter({
        has: page.locator("div[title='wait']"),
    });

    const waitCount = await waitChapters.count();

    for (let i = 0; i < Math.min(freeCount, waitCount); i++) {
        const href = await waitChapters.nth(i).getAttribute("href");

        if (!href) {
            continue;
        }

        const chapterUrl = new URL(href, page.url()).href;

        const chapterPage = await goChapter(context, chapterUrl);
        await chapterPage.close();
    }
}