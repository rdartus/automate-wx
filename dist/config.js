import { readFile } from "node:fs/promises";
export async function loadConfig() {
    for (const path of [
        "/config/list.json",
        "./list.json",
    ]) {
        try {
            const json = await readFile(path, "utf8");
            return JSON.parse(json);
        }
        catch {
        }
    }
    throw new Error("list.json not found");
}
