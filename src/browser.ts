
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
            // 1. Forcer l'utilisation du GPU matériel
            '--ignore-gpu-blocklist',
            '--enable-gpu-rasterization',
            '--enable-features=VaapiVideoDecoder,VaapiVideoEncoder',
            '--use-gl=egl',
            
            // 2. Interdire formellement le fallback sur le CPU (logiciel)
            '--disable-software-rasterizer',
            
            // 3. (Optionnel mais recommandé) Patchright gère déjà beaucoup de choses, 
            // mais ces flags aident à stabiliser le GPU en headless sous Linux
            '--disable-dev-shm-usage',       
       
            // "--disable-blink-features=AutomationControlled", // Supprime la variable navigator.webdriver  - déjà présent dans patchright
            "--no-sandbox",                                   // Requis pour s'exécuter dans Docker
            "--disable-setuid-sandbox"
        ]
    });
    await context.setDefaultTimeout(60_000);
    await context.setDefaultNavigationTimeout(90_000);
    // Injecte des scripts au démarrage de chaque page pour nettoyer les dernières traces JS - inutile car sandboxé dans patchright
    // await context.addInitScript(() => {
    //     // Force la suppression finale du drapeau webdriver au niveau JS
    //     Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    //     // Simule la présence de l'objet chrome utilisé par les vrais navigateurs
    //     window.chrome = { runtime: {} };
    // });

    return context;
}