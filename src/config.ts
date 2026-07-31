import { readFile } from "node:fs/promises";

export interface Config {

    site: string;

    books: string[];

    /** Livres terminés (scraping fait) — candidats à la génération epub */
    done?: string[];

}

export async function loadConfig(): Promise<Config> {

    for (const configPath of [
        "/config/list.json",
        "./list.json",
    ]) {

        try {

            const json = await readFile(configPath, "utf8");

            const parsed = JSON.parse(json);

            // Validation minimale : on s'assure que les champs obligatoires sont présents
            if (typeof parsed.site !== "string" || parsed.site.trim() === "") {
                throw new Error(`list.json invalide : "site" doit être une URL non vide`);
            }

            if (!Array.isArray(parsed.books)) {
                throw new Error(`list.json invalide : "books" doit être un tableau`);
            }

            return parsed as Config;

        } catch (err) {

            // On propage les erreurs de validation, on ignore seulement les erreurs de lecture
            if (err instanceof SyntaxError || (err instanceof Error && err.message.startsWith("list.json invalide"))) {
                throw err;
            }

        }

    }

    throw new Error("list.json not found");

}
