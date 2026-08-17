import { promises as fs } from "fs";
import { execa } from "execa";
import path from "node:path";
import { BrowserContext, Page } from "patchright";
import { htmlToMarkdown } from "./markdown/htmlToMarkdown.js";

/**
 * Génère le fichier metadata.yaml pour Pandoc à partir des infos de la page du roman.
 * Doit être appelé pendant que la page du roman est ouverte (avant generateText).
 *
 * Fichier produit : <outputDir>/metadata.yaml
 */
export async function generateMetadata(page: Page, outputDir: string): Promise<void> {

    // Titre du roman (balise og:title ou h1 principal)
    const title = await page
        .locator('meta[property="og:title"]')
        .getAttribute("content")
        .catch(() => null)
        ?? await page.locator("h1").first().textContent().catch(() => null)
        ?? path.basename(outputDir);

    // Auteur (souvent dans un lien ou texte sous le titre)
    const author = await page
        .locator('meta[name="author"]')
        .getAttribute("content")
        .catch(() => null)
        ?? await page
            .locator('a[href*="/author/"], span[class*="author"]')
            .first()
            .textContent()
            .catch(() => null)
        ?? "Inconnu";

    const yaml = [
        `---`,
        `title: "${title.trim().replace(/"/g, '\\"')}"`,
        `author: "${author.trim().replace(/"/g, '\\"')}"`,
        `lang: en`,
        `---`,
        ``,
    ].join("\n");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, "metadata.yaml"), yaml, "utf8");

    console.log(`[metadata] Titre: "${title.trim()}" | Auteur: "${author.trim()}"`);
}

export async function generateEpub(outputDir: string, epubsDir?: string) {
    console.log("=== Début de la génération de l'eBook ===");

    // 1. Lire le dossier outputDir et filtrer les fichiers .md
    const allFiles = await fs.readdir(outputDir);

    // 2. Tri numérique naturel
    // Trie correctement : 0001.md, 0002.md, 0010.md
    const mdFiles = allFiles
        .filter((file) => file.endsWith(".md"))
        .sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
        );

    if (mdFiles.length === 0) {
        throw new Error(`Aucun fichier .md trouvé dans ${outputDir}.`);
    }

    console.log(`${mdFiles.length} fichier(s) détecté(s).`);

    const slug = path.basename(outputDir);

    // L'epub est écrit dans epubsDir si fourni, sinon dans outputDir
    const targetDir = epubsDir ?? outputDir;
    await fs.mkdir(targetDir, { recursive: true });

    const epubFile  = path.join(targetDir, `${slug}.epub`);
    const coverFile = path.join(outputDir, "..", "covers", `${slug}.webp`);
    const metadataFile = path.join(outputDir, "metadata.yaml");

    // Vérifier que metadata.yaml existe, sinon générer un fallback minimal
    await fs.access(metadataFile).catch(async () => {
        console.warn("[metadata] metadata.yaml absent — génération d'un fallback.");
        const fallback = [`---`, `title: "${slug}"`, `lang: en`, `---`, ``].join("\n");
        await fs.writeFile(metadataFile, fallback, "utf8");
    });

    const mdFilesAbs = mdFiles.map((f) => path.join(outputDir, f));

    // 3. Préparer les arguments pour Pandoc
    const args = [
        ...mdFilesAbs,
        metadataFile,
        "-f",
        "markdown",
        "--toc",
        "--epub-chapter-level=1",
        "--reference-location=block",
        ...(await fs.access(coverFile).then(() => [`--epub-cover-image=${coverFile}`]).catch(() => [])),
        "-o",
        epubFile,
    ];

    // 4. Exécuter Pandoc — on throw pour laisser l'appelant gérer (pas de process.exit)
    console.log("Compilation Pandoc en cours...");
    await execa("pandoc", args);

    console.log(`[SUCCÈS] L'eBook '${epubFile}' a été généré !`);
}

export async function generateCover(page: Page, outputDir: string) {

    const cover = page.locator(
        'img[src^="https://cdn.wuxiaworld.com/images/covers/"]'
    );

    const coverUrl = await cover.getAttribute("src");

    if (!coverUrl) {
        throw new Error("Cover URL not found.");
    }

    const response = await page.context().request.get(coverUrl);

    if (!response.ok()) {
        throw new Error(`Failed to download cover: ${response.status()}`);
    }

    await fs.mkdir(path.join(outputDir, "covers"), { recursive: true });

    // Slug extrait de l'URL de la page (ex: "yama-rising")
    const slug = new URL(page.url()).pathname.split("/").filter(Boolean).pop();

    if (!slug) {
        throw new Error(`Impossible d'extraire le slug depuis l'URL : ${page.url()}`);
    }

    await fs.writeFile(
        path.join(outputDir, "covers", `${slug}.webp`),
        await response.body()
    );

    console.log(`Cover saved to covers/${slug}.webp`);
}

export async function getTextChapter(
    context: BrowserContext,
    chapterUrl: string,
): Promise<string> {

    const page = await context.newPage();

    try {
        await page.goto(chapterUrl, {
            waitUntil: "domcontentloaded",
        });

        const chapterContent = page.locator("div.prose");

        await chapterContent.waitFor({
            state: "visible",
        });

        return await htmlToMarkdown(chapterContent);

    } finally {
        // Fermeture garantie même si htmlToMarkdown ou goto lève une erreur
        await page.close();
    }
}

export async function generateText(page: Page, context: BrowserContext, outputDir: string) {

    await page.getByRole("tab", {
        name: /chapters/i,
    }).click();

    const books = page.locator("#novel-tabs h3");
    const bookCount = await books.count();
    for (let i = 0; i < bookCount; i++) {
        await books.nth(i).click();
    }
    // Attendre la fin des éventuelles requêtes déclenchées
    await page.waitForLoadState("networkidle").catch(() => {});

    // Tous les chapitres
    const chapters = page.locator(
        'div[role="tabpanel"] div:has(> h3) a'
    );

    await chapters.first().waitFor({
        state: "visible",
        timeout: 10000,
    });

    const totalChapters = await chapters.count();

    // Tous les chapitres possédés
    const ownedChapters = chapters.filter({
        hasText: /owned/i,
    });

    const ownedCount = await ownedChapters.count();

    console.log(`Extracting ${ownedCount} owned chapters from ${totalChapters} total chapters...`);

    // -- Reprise sur crash --
    // On lit les fichiers déjà présents sur le PVC pour éviter de re-scraper
    // ce qui a déjà été fait lors d'un run précédent.
    await fs.mkdir(outputDir, { recursive: true });
    const existingFiles = new Set(await fs.readdir(outputDir));

    let skipped = 0;

    for (let i = 0; i < ownedCount; i++) {

        const filename = `${String(i + 1).padStart(4, "0")}.md`;

        // Si le fichier existe déjà sur le PVC, on skip le chapitre
        if (existingFiles.has(filename)) {
            skipped++;
            continue;
        }

        const href =
            await ownedChapters
                .nth(i)
                .getAttribute("href");

        if (!href)
            continue;

        const chapterUrl =
            new URL(href, page.url()).href;

        console.log(
            `[${i + 1}/${ownedCount}] ${chapterUrl}`
        );

        const markdown =
            await getTextChapter(
                context,
                chapterUrl,
            );

        await fs.writeFile(
            path.join(outputDir, filename),
            markdown,
            "utf8",
        );
        console.log(
            `Finished writing ${filename}`
        );
    }

    if (skipped > 0) {
        console.log(`[reprise] ${skipped} chapitre(s) déjà présents sur le PVC — skippés.`);
    }

    console.log(
        `Finished extracting chapters.`
    );
}

// ---------------------------------------------------------------------------
// FONCTION DÉSACTIVÉE — À activer quand prêt
//
// generateEpubForDone
//
// Lit la liste `done` du fichier de config et génère un epub pour chaque livre.
// Chaque livre doit déjà avoir ses fichiers .md extraits dans <baseOutputDir>/<slug>/
// (produits par generateText).
//
// Les epubs sont écrits dans <baseOutputDir>/epubs/<slug>.epub (séparé des .md).
//
// Utilisation (dans main.ts) :
//   import { generateEpubForDone } from "./epub.js";
//   await generateEpubForDone(config, "dist");
//
// ---------------------------------------------------------------------------

export async function generateEpubForDone(
  config: import("./config.js").Config,
  baseOutputDir: string,
): Promise<void> {

  const done = config.done ?? [];

  if (done.length === 0) {
    console.log("[epub] Aucun livre dans 'done', rien à générer.");
    return;
  }

  const epubsDir = path.join(baseOutputDir, "epubs");

  for (const bookUrl of done) {
    // Extrait le slug depuis l'URL, ex: "sss-class-revival-hunter"
    const slug = new URL(bookUrl).pathname.split("/").filter(Boolean).pop();

    if (!slug) {
      console.warn(`[epub] Impossible d'extraire le slug de : ${bookUrl}`);
      continue;
    }

    const outputDir = path.join(baseOutputDir, slug);

    console.log(`[epub] Génération epub pour : ${slug}`);

    try {
      // epubsDir sépare les .epub des .md sur le PVC
      await generateEpub(outputDir, epubsDir);
    } catch (error) {
      console.error(
        `[epub] Échec pour ${slug} :`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}