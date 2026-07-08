import { goChapter } from "./chapter.js";
import { ensureLoggedIn } from "./auth.js";
export async function goBook(context, page, url) {
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
    await page.waitForLoadState("networkidle").catch(() => { });
    // Attendre que les chapitres soient réellement présents
    const chapters = page.locator("a:has(div[title='wait'])");
    await chapters.first().waitFor({
        state: "visible",
        timeout: 1000,
    });
    // const count = Math.min(
    //     freeCount,
    //     await chapters.count()
    // );
    for (let i = 0; i < freeCount; i++) {
        const href = await chapters
            .nth(i)
            .getAttribute("href");
        if (!href)
            continue;
        const chapterUrl = new URL(href, page.url()).href;
        const chapterPage = await goChapter(context, chapterUrl);
        await chapterPage.close();
    }
}
