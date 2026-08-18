
import { chromium } from "patchright";

declare global {
  interface Window {
    chrome?: {
      runtime: Record<string, unknown>;
    };
  }
}


export async function createBrowser() {
    return chromium.launch({
        headless: false
   });
}

// Option recommandée : Utiliser un contexte persistant directement
export async function createStealthContext() {
    // Lance un contexte qui gère à la fois le navigateur et le profil
    const context = await chromium.launchPersistentContext("./user_data", {
        channel: "chrome", // Utilise le vrai Google Chrome installé dans le conteneur
        headless: false,   // Mode headful indispensable
        locale: "fr-FR",
        timezoneId: "Europe/Paris",
        viewport: {
            width: 1920,
            height: 1080,
        },
        args: [
            "--disable-blink-features=AutomationControlled", // Supprime la variable navigator.webdriver
            "--no-sandbox",                                   // Requis pour s'exécuter dans Docker
            "--disable-setuid-sandbox"
        ]
    });

    // Injecte des scripts au démarrage de chaque page pour nettoyer les dernières traces JS
    await context.addInitScript(() => {
        // Force la suppression finale du drapeau webdriver au niveau JS
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // Simule la présence de l'objet chrome utilisé par les vrais navigateurs
        window.chrome = { runtime: {} };
    });

    return context;
}