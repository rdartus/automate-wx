import { Page, Locator } from "patchright";
import { setTimeout } from "timers/promises";

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
        await page.goto("https://bot.sannysoft.com/", { waitUntil: "networkidle" });
        
        // Un léger délai pour laisser les scripts de détection finir de s'exécuter
        await page.waitForTimeout(2000);

        console.log(`[TEST] URL actuelle : ${page.url()}`);

        // 2. Extraction dynamique des données du premier tableau (Intoli Tests)
        const testResults = await page.evaluate(() => {
            const rows = document.querySelectorAll("table tr");
            const data: Record<string, string> = {};
            
            rows.forEach(row => {
                const cells = row.querySelectorAll("td");
                if (cells.length >= 2) {
                    const name = cells[0].textContent?.trim() || "";
                    const result = cells[1].textContent?.trim() || "";
                    if (name) data[name] = result;
                }
            });
            return data;
        });

        // 3. Extraction ciblée des variables critiques liées au GPU / Masquage
        const webglVendor = testResults["WebGL Vendor"] || "Non trouvé";
        const webglRenderer = testResults["WebGL Renderer"] || "Non trouvé";
        const webdriverStatus = testResults["WebDriver (New)"] || "Non trouvé";

        // 4. Logs formatés pour la sortie standard du Pod Kubernetes
        console.log("------------------------------------------------");
        console.log(`STATUS WEBDRIVER : ${webdriverStatus}`);
        console.log(`WEBGL VENDOR     : ${webglVendor}`);
        console.log(`WEBGL RENDERER   : ${webglRenderer}`);
        console.log("------------------------------------------------");

        // Analyse automatisée dans vos logs
        if (webglRenderer.includes("SwiftShader") || webglRenderer.includes("Mesa")) {
            console.log("❌ ALERTE : L'accélération matérielle iGPU N'EST PAS active. Le conteneur utilise un rendu CPU logiciel (détectable).");
        } else {
            console.log("✅ SUCCÈS : L'accélération iGPU est active (Le GPU Intel ou AMD est bien exploité par le navigateur !)");
        }

        if (webdriverStatus.toLowerCase().includes("fail")) {
            console.log("❌ ALERTE : Le drapeau navigator.webdriver a été détecté par la page.");
        } else {
            console.log("✅ SUCCÈS : Le drapeau navigator.webdriver est correctement masqué.");
        }

    } catch (error) {
        console.error("❌ Erreur pendant l'exécution du test Sannysoft :", error);
    }
    
    console.log("=== FIN DU TEST SANNYSOFT ===");
}