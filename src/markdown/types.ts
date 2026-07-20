export interface Footnote {

    id: string;

    number: string;

    text: string;

}

export interface RenderContext {

    footnotes: Map<string, Footnote>;

    footnoteOrder: string[];

}