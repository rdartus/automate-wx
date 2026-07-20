export function normalizeMarkdown(
    markdown: string,
): string {

    const lines =
        markdown
            .replace(/\r\n/g, "\n")
            .split("\n");

    const output: string[] = [];

    let previousBlank = false;

    for (let line of lines) {

        //----------------------------------------
        // Trim fin de ligne
        //----------------------------------------

        line =
            line.replace(/[ \t]+$/g, "");

        //----------------------------------------
        // Trim début des lignes vides
        //----------------------------------------

        if (
            line.trim() === ""
        ) {

            if (!previousBlank) {

                output.push("");

            }

            previousBlank = true;

            continue;

        }

        previousBlank = false;

        //----------------------------------------
        // espaces avant ponctuation
        //----------------------------------------

        line =
            line.replace(/\s+([,.;!?])/g, "$1");

        //----------------------------------------
        // doubles espaces
        //----------------------------------------

        line =
            line.replace(/[ ]{2,}/g, " ");

        output.push(line);

    }

    //----------------------------------------
    // lignes vides avant ---
    //----------------------------------------

    for (
        let i = 0;
        i < output.length;
        i++
    ) {

        if (
            output[i] === "---"
            &&
            i > 0
            &&
            output[i - 1] !== ""
        ) {

            output.splice(i, 0, "");

            i++;

        }

    }

    //----------------------------------------
    // lignes vides avant footnotes
    //----------------------------------------

    for (
        let i = 0;
        i < output.length;
        i++
    ) {

        if (
            output[i].startsWith("[^")
            &&
            i > 0
            &&
            output[i - 1] !== ""
        ) {

            output.splice(i, 0, "");

            i++;

        }

    }

    return output.join("\n").trim() + "\n";

}