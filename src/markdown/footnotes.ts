import {
    Footnote,
    RenderContext,
} from "./types.js";

export function buildFootnotes(
    root: HTMLElement,
): RenderContext {

    const footnotes = new Map<string, Footnote>();

    root.querySelectorAll<HTMLElement>(
        'div[id^="footnote-"]'
    ).forEach(div => {

        const id = div.id;

        const ref =
            div.querySelector("a");

        ref?.remove();

        const number =
            div.textContent
                ?.match(/^\s*(\d+)/)?.[1]
            ??
            id.replace("footnote-", "");

        const text =
            div.textContent
                ?.replace(/^\s*\d+\.\s*/, "")
                .trim()
            ??
            "";

        footnotes.set(id, {

            id,

            number,

            text,

        });

    });

    return {

        footnotes,

        footnoteOrder: [],

    };

}