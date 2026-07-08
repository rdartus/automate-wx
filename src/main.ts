import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { createBrowser } from "./browser.js";
import { loadConfig } from "./config.js";

import { login } from "./auth.js";
import { checkin } from "./reward.js";
import { checkout } from "./reward.js";
import { goBook } from "./book.js";

function attachPageLogging(page: import("playwright").Page) {
    page.on("console", (message) => {
        console.log(`[browser:${message.type()}] ${message.text()}`);
    });

    page.on("pageerror", (error) => {
        console.error("[pageerror]", error);
    });

    page.on("requestfailed", (request) => {
        const failure = request.failure()?.errorText ?? "unknown error";
        console.error(`[requestfailed] ${request.method()} ${request.url()} -> ${failure}`);
    });
}

export async function main() {

    console.log("[job] Starting automate-wx run");

    const config = await loadConfig();
    console.log(`[job] Loaded config with ${config.books.length} book(s)`);

    const browser = await createBrowser();
    const context = await browser.newContext({
        locale: "fr-FR",
        timezoneId: "Europe/Paris",
        viewport: {
            width: 1920,
            height: 1080,
        },
    });    
    const page = await context.newPage();
    attachPageLogging(page);

    await mkdir("errors", { recursive: true });

    try {

        console.log("[step] login");

        await login(
            page,
            context,
            config.site,
        );

        console.log("[step] check-in");

        await checkin(
            page,
            config.site,
        );

        console.log("[step] initial checkout");

        await checkout(
            page,
            config.site,
        );

        for (const book of config.books) {

            try {

                console.log(`[step] book ${book}`);

                await goBook(
                    context,
                    page,
                    book,
                );

            } catch (err) {
                await page.screenshot({
                    path: `errors/book-${Date.now()}.png`,
                    fullPage: true,
                });
                console.error(
                    `Error while processing ${book}`,
                    err
                );

            }

        }

        // Récupère les éventuelles récompenses débloquées
        console.log("[step] final checkout");
        await checkout(
            page,
            config.site,
        );

        console.log("[job] Playwright run completed");

    } finally {

        console.log("[job] Closing browser and context");

        await context.close();

        await browser.close();

        console.log("[job] Shutdown complete");

    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {

        console.error(err);

        process.exit(1);

    });
}