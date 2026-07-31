import { promises as fs } from "fs";
import { execa } from "execa";
import path from "node:path";
import { BrowserContext, Page } from "patchright";
import { htmlToMarkdown } from "./markdown/htmlToMarkdown.js";


//TODO rajouter le nom de la série dans le dossier de sortie de la cover, de l'epub et des md

export async function generateEpub(outputDir: string) {
  try {
    console.log("=== Début de la génération de l'eBook ===");

    // 1. Lire le dossier et filtrer les fichiers .txt
    const allFiles = await fs.readdir(".");

    // 2. Tri numérique naturel (remplace le 'sort -V' de Linux)
    // Trie correctement : 1.txt, 2.txt, 10.txt
    const txtFiles = allFiles
      .filter((file) => file.endsWith(".txt"))
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );

    if (txtFiles.length === 0) {
      throw new Error("Aucun fichier .txt trouvé dans le dossier.");
    }

    console.log("Fichiers détectés dans l'ordre :", txtFiles);

    // 3. Préparer les arguments pour Pandoc
    const args = [
      ...txtFiles,
      "metadata.yaml",
      "-f",
      "markdown",
      "--toc",
      "--epub-chapter-level=1",
      "--reference-location=block",
      "--epub-cover-image=couverture.jpg",
      "-o",
      "mon_livre_pro.epub",
    ];

    // 4. Exécuter Pandoc
    console.log("Compilation Pandoc en cours...");
    await execa("pandoc", args);

    console.log("[SUCCÈS] L'eBook 'mon_livre_pro.epub' a été généré !");
  } catch (error) {
    if (error instanceof Error) {
      console.error("[ERREUR] Échec de la génération :", error.message);
    } else {
      console.error("[ERREUR] Échec de la génération :", error);
    }
    process.exit(1);
  }
}

export async function generateCover(page: Page,outputDir: string) {

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

  const filename = path.basename(new URL(coverUrl).pathname);
  // ex: yr.webp

  const slug = new URL(page.url()).pathname.split("/").pop();
  // yama-rising

  await fs.writeFile(
    path.join(outputDir, "covers", `${slug}.webp`),
    await response.body()
  );

  console.log(`Cover saved to covers/${filename}`);
}

export async function getTextChapter(
    context: BrowserContext,
    chapterUrl: string,
): Promise<string> {

    const page = await context.newPage();

    await page.goto(chapterUrl, {
        waitUntil: "networkidle",
    });

    const chapterContent = page.locator("div.prose");

    await chapterContent.waitFor({
        state: "visible",
    });

    const markdown = await htmlToMarkdown(chapterContent);

    await page.close();

    return markdown;
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
    // Attendre la fin des éventuelles requêtes déclenchées
    await page.waitForLoadState("networkidle").catch(() => {});


  // Tous les chapitres
  const chapters = page.locator(
    'div[role="tabpanel"] div:has(> h3) a'
  );

  await chapters.first().waitFor({
    state: "visible",
    timeout: 1000,
  });

const totalChapters = await chapters.count();

  // Tous les chapitres possédés
  const ownedChapters = chapters.filter({
    hasText: /owned/i,
  });

  const ownedCount = await ownedChapters.count();

  console.log(`Extracting ${ownedCount} owned chapters from ${totalChapters} total chapters...`);

for (let i = 0; i < ownedCount; i++) {

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

    const filename =
        `${String(i + 1).padStart(4, "0")}.md`;

    await fs.writeFile(
        path.join(outputDir, filename),
        markdown,
        "utf8",
    );
    console.log(
        `Finished writing ${filename} `
    );
    
  }
  
  console.log(
      `Finished extracting chapters.`
  );
}