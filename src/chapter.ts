import { BrowserContext, Page } from "patchright";
import { ensureLoggedIn, waitForDomStable } from "./utils.js";

export async function goChapter(
    context: BrowserContext,
    url: string
): Promise<Page> {

    console.log("------------------------ Start chapter opening ------------------------------------");
    console.log(`---------Book : ${url} --------`);

    const chapterUrl = new URL(url).href;

    const page = await context.newPage();

    await page.goto(chapterUrl, { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page);
    await waitForDomStable(page);
    return page;
}

