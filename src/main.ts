import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { createBrowser, createStealthContext } from "./browser.js";
import { loadConfig } from "./config.js";

import { login } from "./auth.js";
import { checkin } from "./reward.js";
import { checkout } from "./reward.js";
import { goBook } from "./book.js";
import { runSannysoftTest } from "./furtif.js";
import { Page } from "playwright";

function attachPageLogging(page: Page) {
    page.on("console", (message) => {
        console.log(`[browser:${message.type()}] ${message.text()}`);
    });

    page.on("pageerror", (error) => {
        console.error("[pageerror]", error);
    });
    page.on("crash", () => {
        console.error("[BROWSER] La page Chromium a crashé");
    });
    page.on("close", () => {
        console.error("[BROWSER] La page a été fermée");
    });

    page.context().browser()?.on("disconnected", () => {
        console.error("[BROWSER] Le navigateur est déconnecté");
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
    const context = await createStealthContext();
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

            } catch (error) {
                console.error(
                    "[ERREUR] Échec de l'automatisation :",
                    error instanceof Error ? error.message : error
                );

                await takeErrorScreenshot(page);

                throw error;
            }


        }

        // Récupère les éventuelles récompenses débloquées
        console.log("[step] final checkout");
        await checkout(
            page,
            config.site,
        );
        console.log("[job] Playwright run completed");

        // vérifie les résultats du test Sannysoft
        await runSannysoftTest(page);

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

async function takeErrorScreenshot(page: Page) {
    try {
        await page.screenshot({
            path: "error.png",
            timeout: 5000,
            animations: "disabled",
        });

        console.log("[INFO] Screenshot sauvegardé");
    } catch (error) {
        console.error(
            "[WARN] Échec de la capture d'écran :",
            error instanceof Error ? error.message : error
        );
    }
}