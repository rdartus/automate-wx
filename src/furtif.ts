import { Page, Locator } from "patchright";
import { setTimeout } from "timers/promises";
import { waitForDomStable } from "./utils.js";

/**
 * Génère les points d'une courbe de Bézier cubique entre un point A et un point B
 */
export function generateBezierPoints(startX: number, startY: number, endX: number, endY: number, steps: number = 20): { x: number, y: number }[] {
    const points: { x: number, y: number }[] = [];
    
    // Génération de points de contrôle aléatoires pour créer une courbe naturelle
    const controlX1 = startX + (endX - startX) * Math.random();
    const controlY1 = startY + (endY - startY) * Math.random() - 50; // Légère déviation vers le haut/bas
    const controlX2 = startX + (endX - startX) * Math.random();
    const controlY2 = startY + (endY - startY) * Math.random() + 50;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Formule mathématique de la courbe de Bézier cubique
        const x = Math.pow(1 - t, 3) * startX + 3 * Math.pow(1 - t, 2) * t * controlX1 + 3 * (1 - t) * Math.pow(t, 2) * controlX2 + Math.pow(t, 3) * endX;
        const y = Math.pow(1 - t, 3) * startY + 3 * Math.pow(1 - t, 2) * t * controlY1 + 3 * (1 - t) * Math.pow(t, 2) * controlY2 + Math.pow(t, 3) * endY;
        points.push({ x: Math.round(x), y: Math.round(y) });
    }
    return points;
}

// On garde une trace de la position actuelle de la souris (initialisée au centre par défaut)
let currentMousePos = { x: 500, y: 500 };

export async function humanClick(page: Page, locator: Locator): Promise<void> {
    // 1. Récupérer la boîte de collision (bounding box) de l'élément
    const box = await locator.boundingBox();
    if (!box) throw new Error("Élément non visible ou introuvable");

    // 2. Cibler un point aléatoire À L'INTÉRIEUR du bouton (pas pile au centre)
    const padding = 5;
    const targetX = box.x + padding + Math.random() * (box.width - padding * 2);
    const targetY = box.y + padding + Math.random() * (box.height - padding * 2);

    // 3. Générer les points de la courbe de Bézier
    const steps = Math.floor(Math.random() * 15) + 15; // Entre 15 et 30 étapes de mouvement
    const points = generateBezierPoints(currentMousePos.x, currentMousePos.y, targetX, targetY, steps);

    // 4. Déplacer la souris le long de la courbe avec des micro-délais variables
    for (const point of points) {
        await page.mouse.move(point.x, point.y);
        // Attente très courte entre chaque point (entre 2ms et 6ms) pour simuler la vitesse
        await setTimeout(Math.random() * 4 + 2); 
    }

    // Mettre à jour la dernière position connue de la souris
    currentMousePos = { x: targetX, y: targetY };

    // 5. Petite pause humaine avant le clic (réflexe)
    await setTimeout(Math.random() * 100 + 50);

    // 6. Effectuer le clic physique
    await page.mouse.down();
    await setTimeout(Math.random() * 40 + 20); // Temps de pression sur le bouton (20-60ms)
    await page.mouse.up();
}

/**
 * Navigue sur SannySoft et logge les résultats critiques de détection des bots
 */
export async function runSannysoftTest(page: Page): Promise<void> {
    console.log("=== DÉBUT DU TEST SANNYSOFT ===");
    
    try {
        // 1. Navigation vers le banc d'essai
        await page.goto("https://bot.sannysoft.com/", { waitUntil: "domcontentloaded" });
        
        // Attendre que la table de détection soit chargée dans le DOM
        await page.waitForSelector("table tr", { timeout: 10000 });
        // Petit délai pour laisser les tests JS asynchrones de Sannysoft se finaliser
        await page.waitForTimeout(1500);

        console.log(`[TEST] URL actuelle : ${page.url()}`);

        // 2. Extraction dynamique de tous les résultats de test
        const testResults = await page.evaluate(() => {
            const rows = document.querySelectorAll("table tr");
            const data: Record<string, { result: string; failed: boolean }> = {};
            
            rows.forEach(row => {
                const cells = row.querySelectorAll("td");
                if (cells.length >= 2) {
                    const name = cells[0].textContent?.trim() || "";
                    const result = cells[1].textContent?.trim() || "";
                    // Sannysoft applique la classe "failed" ou "passed" sur la cellule de résultat
                    const failed = cells[1].classList.contains("failed") || cells[1].classList.contains("warn");
                    if (name) data[name] = { result, failed };
                }
            });
            return data;
        });

        // 3. Extraction des variables clés
        const webglVendor = testResults["WebGL Vendor"]?.result || "Non trouvé";
        const webglRenderer = testResults["WebGL Renderer"]?.result || "Non trouvé";
        
        // Sannysoft nomme parfois la ligne "WebDriver" ou "WebDriver (New)"
        const webdriverEntry = testResults["WebDriver (New)"] || testResults["WebDriver"];
        const webdriverStatus = webdriverEntry?.result || "Non trouvé";
        const webdriverFailed = webdriverEntry?.failed ?? false;

        // 4. Logs formatés
        console.log("------------------------------------------------");
        console.log(`STATUS WEBDRIVER : ${webdriverStatus}`);
        console.log(`WEBGL VENDOR     : ${webglVendor}`);
        console.log(`WEBGL RENDERER   : ${webglRenderer}`);
        console.log("------------------------------------------------");

        // 5. Analyse du rendu GPU (Détection spécifique des rendus logiciels CPU)
        const softwareRenderers = ["swiftshader", "llvmpipe", "softpipe", "software rasterizer"];
        const lowerRenderer = webglRenderer.toLowerCase();
        
        const isSoftwareRendering = softwareRenderers.some(sw => lowerRenderer.includes(sw));

        if (isSoftwareRendering || webglRenderer === "Non trouvé") {
            console.log("❌ ALERTE : Rendu logiciel détecté ! Le conteneur n'utilise pas l'iGPU (Rendu CPU : " + webglRenderer + ")");
        } else {
            console.log("✅ SUCCÈS : L'accélération iGPU est active (" + webglRenderer + ")");
        }

        // 6. Analyse du Stealth (WebDriver)
        if (webdriverFailed || webdriverStatus.toLowerCase().includes("present")) {
            console.log("❌ ALERTE : Le drapeau navigator.webdriver a été détecté par la page.");
        } else {
            console.log("✅ SUCCÈS : Le drapeau navigator.webdriver est correctement masqué (missing).");
        }

    } catch (error) {
        console.error("❌ Erreur pendant l'exécution du test Sannysoft :", error);
    }
    
    console.log("=== FIN DU TEST SANNYSOFT ===");
}