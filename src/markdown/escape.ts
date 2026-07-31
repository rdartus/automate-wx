export function escapeMarkdown(text: string): string {

    return text
        .replace(/\\/g, "\\\\")
        .replace(/\*/g, "\\*")
        .replace(/_/g, "\\_")
        .replace(/`/g, "\\`")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/#/g, "\\#")
        // '>' n'est pas échappé : Pandoc l'interprète comme blockquote (comportement souhaité)
        .replace(/\|/g, "\\|");
}
export function cleanText(
    text: string,
): string {

    return text

        // nbsp
        .replace(/\u00A0/g, " ")

        // espaces multiples
        .replace(/[ \t]{2,}/g, " ")

        // espaces avant ponctuation
        .replace(/\s+([,.;!?])/g, "$1")

        // espaces avant retour
        .replace(/[ \t]+\n/g, "\n");
}