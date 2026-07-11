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

    // Livre entièrement gratuit ?
    if (await page.getByText("Free for All Chapters").last().isVisible().catch(() => false)) {
        console.log("Book is free, skip.");
        return;
    }

    const freeText = await page
        .locator("div span[role='status']")
        .first()
        .textContent();

    const freeCount = parseInt(freeText?.split(" ")[0] ?? "0", 10);

    if (freeCount < 1) {
        console.log("No free chapters. Skip.");
        return;
    }
    else {
        //log du nombre de chapitres gratuits
        console.log(`${freeCount} free chapters available.`);
    }

    const status = await page
        .locator("div span[role='status'] ~ span div[class*=text]")
        .filter({hasText: /^\d{2}:\d{2}:\d{2}$/})
        .textContent();

    const timer = status?.match(/\d{2}:\d{2}:\d{2}/)?.[0];

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
    // Attendre la fin des éventuelles requêtes déclenchées
    await page.waitForLoadState("networkidle").catch(() => {});

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