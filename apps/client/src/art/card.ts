import type {Card, Color} from "@uno/engine";
import {blank, write, type Canvas, type Paint} from "./canvas";
import type {CardSize} from "./size";

export const RAINBOW: Paint[] = ["red", "yellow", "green", "blue"];

const COLOR_LETTERS: Record<Color, string> = {red: "R", yellow: "Y", green: "G", blue: "B"};

const DIGITS: Record<string, [string, string, string]> = {
    "0": ["╭─╮", "│ │", "╰─╯"],
    "1": ["╶┐ ", " │ ", "╶┴╴"],
    "2": ["╶─╮", "╭─╯", "╰─╴"],
    "3": ["╶─╮", " ─┤", "╶─╯"],
    "4": ["╷ ╷", "╰─┤", "  ╵"],
    "5": ["╭─╴", "╰─╮", "╶─╯"],
    "6": ["╭─╴", "├─╮", "╰─╯"],
    "7": ["╶─╮", "  │", "  ╵"],
    "8": ["╭─╮", "├─┤", "╰─╯"],
    "9": ["╭─╮", "╰─┤", "╶─╯"],
};

const PLUS = ["   ", " + ", "   "];

const ART = {
    skip: [" .-. ", "( / )", " '-' "],
    reverse: [" <──╮", " │  │", "╰──> "],
};

export function cardLabel(card: Card): string {
    switch (card.kind) {
        case "number":
            return String(card.value);
        case "skip":
            return "(/)";
        case "reverse":
            return "<>";
        case "drawTwo":
            return "+2";
        case "wild":
            return "W";
        case "wildDrawFour":
            return "+4";
    }
}

export function colorLetter(card: Card): string | null {
    return card.kind === "wild" || card.kind === "wildDrawFour" ? null : COLOR_LETTERS[card.color];
}

export function cardPaint(card: Card): Paint {
    return card.kind === "wild" || card.kind === "wildDrawFour" ? "white" : card.color;
}

export function cardFace(card: Card, size: CardSize): Canvas {
    const color = cardPaint(card);
    const canvas = frame(size, color, colorLetter(card));
    const label = cardLabel(card);

    write(canvas, 1, 1, label, {color, bold: true});
    write(canvas, size.width - 1 - label.length, size.height - 2, label, {color, bold: true});

    if (size.height >= 7) {
        drawArt(canvas, card, size, color);
    } else if (size.height >= 5) {
        const middle = Math.floor(size.height / 2);
        write(canvas, Math.floor((size.width - label.length) / 2), middle, label, {color, bold: true});
    }

    return canvas;
}

export function cardBack(size: CardSize, labelled = true): Canvas {
    const canvas = frame(size, "gray", null);
    if (labelled) {
        const middle = size.height >= 5 ? Math.floor(size.height / 2) : 1;
        write(canvas, Math.floor((size.width - 3) / 2), middle, "UNO", {color: "red", bold: true});
    }
    return canvas;
}

function drawArt(canvas: Canvas, card: Card, size: CardSize, color: Paint): void {
    const top = Math.floor((size.height - 3) / 2);

    if (card.kind === "wild") {
        const left = Math.floor(size.width / 2) - 2;
        write(canvas, left, top, "  ", {bg: "red"});
        write(canvas, left + 3, top, "  ", {bg: "blue"});
        write(canvas, left, top + 2, "  ", {bg: "yellow"});
        write(canvas, left + 3, top + 2, "  ", {bg: "green"});
        return;
    }

    const lines = artLines(card);
    const width = Math.max(...lines.map((line) => line.length));
    const left = Math.floor((size.width - width) / 2);
    const rainbow = card.kind === "wildDrawFour" ? rainbowByColumn(lines) : new Map<number, Paint>();

    lines.forEach((line, dy) => {
        Array.from(line).forEach((ch, dx) => {
            if (ch !== " ") {
                write(canvas, left + dx, top + dy, ch, {color: rainbow.get(dx) ?? color, bold: true});
            }
        });
    });
}

function rainbowByColumn(lines: string[]): Map<number, Paint> {
    const width = Math.max(...lines.map((line) => line.length));
    const used = Array.from({length: width}, (_, x) => x).filter((x) => lines.some((line) => (line[x] ?? " ") !== " "));
    return new Map(used.map((x, i) => [x, RAINBOW[i % RAINBOW.length] ?? "white"]));
}

function artLines(card: Card): string[] {
    switch (card.kind) {
        case "number":
            return DIGITS[String(card.value)] ?? PLUS;
        case "skip":
            return ART.skip;
        case "reverse":
            return ART.reverse;
        case "drawTwo":
            return beside(PLUS, DIGITS["2"] ?? PLUS);
        case "wildDrawFour":
            return beside(PLUS, DIGITS["4"] ?? PLUS);
        case "wild":
            return [];
    }
}

function beside(left: string[], right: string[]): string[] {
    return left.map((line, i) => line + (right[i] ?? ""));
}

function frame(size: CardSize, color: Paint, letter: string | null): Canvas {
    const canvas = blank(size.width, size.height);
    const inner = size.width - 2;
    write(canvas, 0, 0, `╭${"─".repeat(inner)}╮`, {color});
    for (let y = 1; y < size.height - 1; y++) {
        write(canvas, 0, y, "│", {color});
        write(canvas, size.width - 1, y, "│", {color});
    }
    write(canvas, 0, size.height - 1, `╰${"─".repeat(inner)}╯`, {color});
    if (letter) {
        write(canvas, Math.floor(size.width / 2), 0, letter, {color, bold: true});
    }
    return canvas;
}
