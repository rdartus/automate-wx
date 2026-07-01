import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createBrowser } from "./browser.js";
import { loadConfig } from "./config.js";
import { login } from "./auth.js";
import { checkin } from "./reward.js";
import { checkout } from "./reward.js";
import { goBook } from "./book.js";
export async function main() {
    const config = await loadConfig();
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
    await mkdir("errors", { recursive: true });
    try {
        await login(page, context, config.site);
        await checkin(page, config.site);
        await checkout(page, config.site);
        for (const book of config.books) {
            try {
                await goBook(context, page, book);
            }
            catch (err) {
                await page.screenshot({
                    path: `errors/book-${Date.now()}.png`,
                    fullPage: true,
                });
                console.error(`Error while processing ${book}`, err);
            }
        }
        // Récupère les éventuelles récompenses débloquées
        await checkout(page, config.site);
    }
    finally {
        await context.close();
        await browser.close();
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
