import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { createStealthContext } from "./browser.js";
import { loadConfig } from "./config.js";

import { login } from "./auth.js";
import { checkin, checkout } from "./reward.js";
import { goBook } from "./book.js";
import { runSannysoftTest } from "./furtif.js";
import { Page } from "patchright";
import { generateEpubForDone } from "./epub.js";
import * as fs from 'fs/promises';

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

    let currentContext = await createStealthContext();
    let currentPage = await currentContext.newPage();

    attachPageLogging(currentPage);

    await mkdir("errors", { recursive: true });

    // Note: ce dossier sert à stocker les screenshots d'erreur (takeErrorScreenshot)
    // Le chemin est fixe ("error.png" dans le cwd) — pourrait évoluer vers errors/<timestamp>.png

    try {

        console.log("[step] login");

        await login(
            currentPage,
            currentContext,
            config.site,
        );

        console.log("[step] check-in");

        await checkin(
            currentPage,
            config.site,
        );

        console.log("[step] initial checkout");

        await checkout(
            currentPage,
            config.site,
        );

        // Fréquence de nettoyage (ex: recyclage complet tous les 10 livres)
        const RECYCLE_EVERY = 10;

        for (let i = 0; i < config.books.length; i++) {
            const book = config.books[i];
            try {
                console.log(`[step] book ${book} (${i + 1}/${config.books.length})`);

                await goBook(
                currentContext,
                currentPage,
                book
                );

            } catch (error) {
                console.error(
                    "[ERREUR] Échec de l'automatisation :",
                    error instanceof Error ? error.message : error
                );
                // await page.pause();
                // await page.waitForEvent('close', { timeout: 0 });
                await takeErrorScreenshot(currentPage);

                throw error;
            } finally {
                // Purge complète de Chromium tous les X livres (sauf au dernier tour)
                if ((i + 1) % RECYCLE_EVERY === 0 && i < config.books.length - 1) {
                console.log("🧹 Purge mémoire : Recyclage de Chrome...");

                if (!currentPage.isClosed()) {
                    await currentPage.close();
                }
                
                // Ferme Chrome : sauvegarde ./user_data et vide 100 % de la RAM
                await currentContext.close();

                // Redémarre à neuf en conservant la session
                currentContext = await createStealthContext();
                currentPage = await currentContext.newPage();
                }
            }

        }

        // Récupère les éventuelles récompenses débloquées
        console.log("[step] final checkout");
        await checkout(
            currentPage,
            config.site,
        );
        console.log("[job] Playwright run completed");

        // vérifie les résultats du test Sannysoft
        await runSannysoftTest(currentPage);

        // // Génère un EPUB pour les chapitres terminés
        // await generateEpubForDone(config, "dist");

    } finally {

        console.log("[job] Closing browser and context");

        await currentContext.close();

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