import { Locator } from "patchright";

import {
    buildFootnotes,
} from "./footnotes.js";

import {
    renderChildren,
} from "./renderer.js";

import { normalizeMarkdown } from "./normalise.js";

export async function htmlToMarkdown(
    locator: Locator,
): Promise<string> {

    return locator.evaluate(root => {

        var context
        if (root instanceof HTMLElement) {
            context = buildFootnotes(root);
        }
        else {
            console.error("Root is not an HTMLElement");
            return "";
        }

        let markdown =
            renderChildren(root, context);

        markdown =
            markdown.trim();

        if (context.footnoteOrder.length) {

            markdown += "\n\n---\n\n";

            for (const id of context.footnoteOrder) {

                const note =
                    context.footnotes.get(id);

                if (!note)
                    continue;

                markdown +=
                    `[^${note.number}]: ${note.text}\n`;
            }

        }

        return normalizeMarkdown(markdown);

    });

}