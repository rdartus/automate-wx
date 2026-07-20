import { escapeMarkdown } from "./escape.js";
import { cleanText } from "./escape.js";
import { RenderContext } from "./types.js";

export function renderChildren(
    parent: Node,
    context: RenderContext,
): string {

    let markdown = "";

    parent.childNodes.forEach(node => {
        markdown += renderNode(node, context);
    });

    return markdown;
}

function renderNode(
    node: Node,
    context: RenderContext,
): string {

    //----------------------------------------------------
    // Texte
    //----------------------------------------------------

    if (node.nodeType === Node.TEXT_NODE) {

        return escapeMarkdown(
            cleanText(
                node.textContent ?? ""
            )
        );

    }

    if (!(node instanceof HTMLElement)) {

        return "";

    }

    //----------------------------------------------------
    // Ignore les footnotes
    //----------------------------------------------------

    if (
        node.id.startsWith("footnote-")
        &&
        !node.id.startsWith("footnote-ref-")
    ) {

        return "";

    }

    //----------------------------------------------------
    // HR
    //----------------------------------------------------

    if (node.tagName === "HR") {

        return "";

    }

    //----------------------------------------------------
    // Footnote reference
    //----------------------------------------------------

    if (
        node.id.startsWith("footnote-ref-")
    ) {

        const href =
            node.querySelector("a")
                ?.getAttribute("href");

        if (!href)
            return "";

        const id =
            href.substring(1);

        const footnote =
            context.footnotes.get(id);

        if (!footnote)
            return "";

        if (
            !context.footnoteOrder.includes(id)
        ) {

            context.footnoteOrder.push(id);

        }

        return `[^${footnote.number}]`;

    }

    //----------------------------------------------------
    // rendu des enfants
    //----------------------------------------------------

    let text =
        renderChildren(node, context);

    //----------------------------------------------------
    // BR
    //----------------------------------------------------

    if (
        node.tagName === "BR"
    ) {

        return "\n";

    }

    //----------------------------------------------------
    // Paragraphes
    //----------------------------------------------------

    if (
        node.tagName === "P"
    ) {

        return text.trim() + "\n\n";

    }

    //----------------------------------------------------
    // Images
    //----------------------------------------------------

    if (
        node.tagName === "IMG"
    ) {

        const src =
            node.getAttribute("src");

        const alt =
            node.getAttribute("alt") ?? "";

        if (!src)
            return "";

        return `![${escapeMarkdown(alt)}](${src})`;

    }

    //----------------------------------------------------
    // Liens
    //----------------------------------------------------

    if (
        node.tagName === "A"
    ) {

        const href =
            node.getAttribute("href");

        if (
            href &&
            !href.startsWith("#footnote")
        ) {

            return `[${text}](${href})`;

        }

        return text;

    }

    //----------------------------------------------------
    // Styles
    //----------------------------------------------------

    const style =
        node.style;

    //----------------------------------------------------
    // italique
    //----------------------------------------------------

    if (
        node.tagName === "I"
        ||
        node.tagName === "EM"
        ||
        style.fontStyle === "italic"
    ) {

        text = `*${text}*`;

    }

    //----------------------------------------------------
    // gras
    //----------------------------------------------------

    const weight =
        parseInt(
            style.fontWeight || "400",
            10,
        );

    if (
        node.tagName === "STRONG"
        ||
        node.tagName === "B"
        ||
        weight >= 600
    ) {

        text = `**${text}**`;

    }

    //----------------------------------------------------
    // div
    //----------------------------------------------------

    if (
        node.tagName === "DIV"
    ) {

        return text;

    }

    //----------------------------------------------------
    // span
    //----------------------------------------------------

    if (
        node.tagName === "SPAN"
    ) {

        return text;

    }

    //----------------------------------------------------
    // fallback
    //----------------------------------------------------

    return text;

}