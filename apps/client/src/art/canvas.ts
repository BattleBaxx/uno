export type Paint = "red" | "yellow" | "green" | "blue" | "white" | "gray";

export type Style = {color: Paint | null; bold: boolean; bg: Paint | null; underline: boolean};

export type Cell = Style & {ch: string};

export type Canvas = Cell[][];

const PLAIN: Style = {color: null, bold: false, bg: null, underline: false};

export function blank(width: number, height: number): Canvas {
    return Array.from({length: height}, () => Array.from({length: width}, () => ({...PLAIN, ch: " "})));
}

export function draw(target: Canvas, source: Canvas, x: number, y: number): void {
    source.forEach((row, dy) => {
        const targetRow = target[y + dy];
        if (!targetRow) {
            return;
        }
        row.forEach((cell, dx) => {
            if (x + dx >= 0 && x + dx < targetRow.length) {
                targetRow[x + dx] = cell;
            }
        });
    });
}

export function write(target: Canvas, x: number, y: number, text: string, style: Partial<Style> = {}): void {
    draw(target, [Array.from(text, (ch) => ({...PLAIN, ...style, ch}))], x, y);
}

export function canvasWidth(canvas: Canvas): number {
    return canvas[0]?.length ?? 0;
}

export function toLines(canvas: Canvas): string[] {
    return canvas.map((row) => row.map((cell) => cell.ch).join(""));
}

export type Run = Style & {text: string};

export function toRuns(row: Cell[]): Run[] {
    const runs: Run[] = [];
    for (const {ch, ...style} of row) {
        const last = runs.at(-1);
        if (
            last &&
            last.color === style.color &&
            last.bold === style.bold &&
            last.bg === style.bg &&
            last.underline === style.underline
        ) {
            last.text += ch;
        } else {
            runs.push({...style, text: ch});
        }
    }
    return runs;
}
