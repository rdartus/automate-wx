import { Page, BrowserContext } from "patchright";


interface WaitForPageReadyOptions {
    timeout?: number;            // budget total
    networkIdleTimeout?: number; // combien de temps on TENTE le networkidle
    settleDelay?: number;        // petit filet de sécurité, PAS le mécanisme principal
}


export async function waitForDomStable(
    page: Page,
    options: WaitForPageReadyOptions = {}
): Promise<void> {
    const { timeout = 30000, networkIdleTimeout = 10000, settleDelay = 1000 } = options;

    await page.waitForLoadState("domcontentloaded", { timeout });

    // Best-effort : si ça n'idle jamais (trackers), on continue quand même
    await page
        .waitForLoadState("networkidle", { timeout: networkIdleTimeout })
        .catch(() => console.log("[wait] networkidle non atteint — on continue"));

    if (settleDelay > 0) await page.waitForTimeout(settleDelay);
}

// export async function waitForDomStable(
//     page: Page,
//     { timeout = 15000, stableFor = 500 }: { timeout?: number; stableFor?: number } = {}
// ): Promise<void> {
//     await page.evaluate(`
//         (() => new Promise((resolve) => {
//             let timer;
//             const finish = () => { observer.disconnect(); resolve(); };
//             const reset = () => { clearTimeout(timer); timer = setTimeout(finish, ${stableFor}); };
//             const observer = new MutationObserver(reset);
//             observer.observe(document.body, { childList: true, subtree: true, attributes: true });
//             reset();
//             setTimeout(finish, ${timeout});
//         }))()
//     `);
// }

export async function ensureLoggedIn(page: Page): Promise<void> {
    const vip = page.getByRole("button", { name: /vip/i });

    if (!(await vip.isVisible().catch(() => false))) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForDomStable(page);
    }
}