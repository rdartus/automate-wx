import { Page, BrowserContext } from "patchright";


export async function ensureLoggedIn(page: Page): Promise<void> {
    const vip = page.getByRole("button", { name: /vip/i });

    if (!(await vip.isVisible().catch(() => false))) {
        await page.reload({ waitUntil: "networkidle" });
    }
}

export async function login(
    page: Page,
    context: BrowserContext,
    siteUrl: string
): Promise<void> {

    console.log("[login] Navigating to", siteUrl);

    const user = process.env.USER_WX;
    const password = process.env.PASSWORD_WX;

    if (!user)
        throw new Error("USER_WX is not defined");

    if (!password)
        throw new Error("PASSWORD_WX is not defined");

    console.log(`[login] Using account ${user}`);

    await page.goto(siteUrl, {
        waitUntil: "networkidle",
    });

    console.log("[login] Site loaded, opening profile menu");

    await page.getByRole("button", {
        name: /profile/i,
    }).click();

    const logoutText = page.getByText("Log out", {
        exact: true,
    });

    if (await logoutText.isVisible().catch(() => false)) {
        console.log("[login] Already logged in - Skipping login");
        return;
    }

    console.log("[login] Opening login form");

    await page.getByRole("button", {
        name: /^log\s*in$/i,
    }).click();

    console.log("[login] Filling credentials");

    await page.locator("#Username").fill(user);
    await page.locator("#Password").fill(password);

    console.log("[login] Submitting login form");
    await page.locator("button[value='login']").click();
    
    console.log("[login] Waiting for login result");
    const LOGIN_TIMEOUT = 20000;
    try {
        await Promise.race([
            // Succès : le formulaire (modal) disparaît du DOM
            page.locator("#Username").waitFor({ state: "detached", timeout: LOGIN_TIMEOUT }),
            // Succès alternatif : le menu profil affiche déjà "Log out"
            page.getByText("Log out", { exact: true }).waitFor({ state: "visible", timeout: LOGIN_TIMEOUT }),
        ]);
    } catch {
        throw new Error(
            `[login] Aucun signal de connexion réussie après ${LOGIN_TIMEOUT}ms ` +
            `(identifiants invalides, captcha, ou sélecteur obsolète)`
        );
    }
    
    console.log("[login] Login request settled");

    const cookies = await context.cookies();
    // On logue uniquement les noms pour ne pas exposer les valeurs en clair dans les logs
    console.log(`[login] Session établie — ${cookies.length} cookie(s) : ${cookies.map(c => c.name).join(", ")}`);
}
