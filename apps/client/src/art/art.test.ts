import {describe, it, expect} from "vitest";
import {createDeck, type Card} from "@uno/engine";
import {blank, canvasWidth, draw, toLines, toRuns, write} from "./canvas";
import {cardBack, cardFace, cardLabel} from "./card";
import {layoutHand} from "./hand";
import {CARD_SIZES, MIN_REVEAL, tierFor, type Tier} from "./size";

const deck = createDeck();
const find = (predicate: (c: Card) => boolean) => deck.find(predicate)!;
const redSeven = find((c) => c.kind === "number" && c.color === "red" && c.value === 7);
const blueSkip = find((c) => c.kind === "skip" && c.color === "blue");
const wild = find((c) => c.kind === "wild");
const wildDrawFour = find((c) => c.kind === "wildDrawFour");
const TIERS: Tier[] = ["large", "medium", "small"];

describe("canvas", () => {
    it("draws one canvas onto another and clips at the edges", () => {
        const target = blank(4, 2);
        write(target, 2, 0, "abcd", {color: "red"});
        draw(target, [[{ch: "x", color: null, bold: false, bg: null, underline: false}]], 0, 5);
        expect(toLines(target)).toEqual(["  ab", "    "]);
    });

    it("groups neighbouring cells with the same style into runs", () => {
        const row = blank(5, 1)[0]!;
        const canvas = [row];
        write(canvas, 0, 0, "ab", {color: "red", bold: true});
        write(canvas, 2, 0, "c", {color: "blue"});
        expect(toRuns(canvas[0]!)).toEqual([
            {text: "ab", color: "red", bold: true, bg: null, underline: false},
            {text: "c", color: "blue", bold: false, bg: null, underline: false},
            {text: "  ", color: null, bold: false, bg: null, underline: false},
        ]);
    });
});

describe("tierFor", () => {
    it("picks the biggest tier the terminal fits", () => {
        expect(tierFor(382, 90)).toBe("large");
        expect(tierFor(140, 40)).toBe("large");
        expect(tierFor(139, 40)).toBe("medium");
        expect(tierFor(100, 30)).toBe("medium");
        expect(tierFor(99, 30)).toBe("small");
        expect(tierFor(80, 24)).toBe("small");
    });

    it("refuses terminals smaller than 80×24", () => {
        expect(tierFor(79, 24)).toBeNull();
        expect(tierFor(80, 23)).toBeNull();
    });
});

describe("cardFace", () => {
    it.each(TIERS)("has the exact card size at the %s tier", (tier) => {
        const size = CARD_SIZES[tier];
        for (const card of [redSeven, blueSkip, wild, wildDrawFour]) {
            const lines = toLines(cardFace(card, size));
            expect(lines.length).toBe(size.height);
            expect(lines.every((line) => line.length === size.width)).toBe(true);
        }
    });

    it.each(TIERS)("shows the label in the top-left and bottom-right corners at the %s tier", (tier) => {
        const size = CARD_SIZES[tier];
        const lines = toLines(cardFace(wildDrawFour, size));
        expect(lines[1]!.slice(1, 3)).toBe("+4");
        expect(toLines(cardFace(blueSkip, size))[1]!.slice(1, 4)).toBe("(/)");
        expect(lines[size.height - 2]!.slice(size.width - 3, size.width - 1)).toBe("+4");
    });

    it("colors a normal card in its own color", () => {
        for (const tier of TIERS) {
            const canvas = cardFace(redSeven, CARD_SIZES[tier]);
            const colors = new Set(canvas.flat().map((cell) => cell.color).filter(Boolean));
            expect([...colors]).toEqual(["red"]);
        }
    });

    it.each(TIERS)("puts the color letter in the middle of the top border at the %s tier", (tier) => {
        const size = CARD_SIZES[tier];
        expect(toLines(cardFace(redSeven, size))[0]![Math.floor(size.width / 2)]).toBe("R");
        expect(toLines(cardFace(blueSkip, size))[0]![Math.floor(size.width / 2)]).toBe("B");
    });

    it("gives wild cards no color letter", () => {
        expect(toLines(cardFace(wild, CARD_SIZES.small))[0]).toBe("╭────╮");
    });

    it("shows the four colors as blocks on a large wild card", () => {
        const canvas = cardFace(wild, CARD_SIZES.large);
        const backgrounds = new Set(canvas.flat().map((cell) => cell.bg).filter(Boolean));
        expect([...backgrounds].sort()).toEqual(["blue", "green", "red", "yellow"]);
    });

    it("draws big digits in the exact middle of large number cards", () => {
        const lines = toLines(cardFace(redSeven, CARD_SIZES.large));
        expect(lines.slice(2, 5)).toEqual(["│   ╶─╮   │", "│     │   │", "│     ╵   │"]);
    });

    it("centers the visible part of the art horizontally", () => {
        const size = CARD_SIZES.large;
        for (const card of deck.filter((c) => c.kind !== "wild")) {
            const art = toLines(cardFace(card, size)).slice(2, 5).map((line) => line.slice(1, -1));
            const left = Math.min(...art.map((line) => line.length - line.trimStart().length));
            const right = Math.min(...art.map((line) => line.length - line.trimEnd().length));
            expect(left).toBe(right);
        }
    });

    it("keeps wild +4 corner labels white", () => {
        const canvas = cardFace(wildDrawFour, CARD_SIZES.large);
        expect(canvas[1]!.slice(1, 3).map((cell) => cell.color)).toEqual(["white", "white"]);
    });

    it("only uses characters that are one column wide in every terminal", () => {
        const safe = /^[\x20-\x7e\u2500-\u257f]$/;
        for (const tier of TIERS) {
            for (const card of deck) {
                for (const cell of cardFace(card, CARD_SIZES[tier]).flat()) {
                    expect(cell.ch).toMatch(safe);
                }
            }
            for (const cell of cardBack(CARD_SIZES[tier]).flat()) {
                expect(cell.ch).toMatch(safe);
            }
        }
    });

    it("labels every kind of card", () => {
        expect([redSeven, blueSkip, wild, wildDrawFour].map(cardLabel)).toEqual(["7", "(/)", "W", "+4"]);
        expect(cardLabel(find((c) => c.kind === "reverse"))).toBe("<>");
        expect(cardLabel(find((c) => c.kind === "drawTwo"))).toBe("+2");
    });
});

describe("the +4 art", () => {
    it("uses all four colors", () => {
        const canvas = cardFace(wildDrawFour, CARD_SIZES.large);
        const colors = new Set(canvas.slice(2, 5).flatMap((row) => row.slice(1, -1).map((cell) => cell.color)));
        for (const color of ["red", "yellow", "green", "blue"] as const) {
            expect(colors.has(color)).toBe(true);
        }
    });
});

describe("cardBack", () => {
    it.each(TIERS)("shows UNO and has the card size at the %s tier", (tier) => {
        const size = CARD_SIZES[tier];
        const lines = toLines(cardBack(size));
        expect(lines.length).toBe(size.height);
        expect(lines.some((line) => line.includes("UNO"))).toBe(true);
    });
});

describe("layoutHand", () => {
    const hand = deck.slice(0, 25);

    it.each(TIERS)("never gets wider than the space it is given at the %s tier", (tier) => {
        for (const width of [40, 60, 80, 120, 200]) {
            for (const selected of [0, 12, 24]) {
                const layout = layoutHand(hand, selected, CARD_SIZES[tier], width);
                expect(canvasWidth(layout.canvas)).toBeLessThanOrEqual(Math.max(width, CARD_SIZES[tier].width));
            }
        }
    });

    it("lifts the selected card above the others", () => {
        const size = CARD_SIZES.medium;
        const layout = layoutHand(hand.slice(0, 5), 2, size, 200);
        const lines = toLines(layout.canvas);
        expect(lines.length).toBe(size.height + 1);
        expect(lines[0]!.trim()).toBe(toLines(cardFace(hand[2]!, size))[0]);
    });

    it("shows every card when they fit, with nothing hidden", () => {
        const layout = layoutHand(hand.slice(0, 5), 0, CARD_SIZES.large, 200);
        expect(layout.hiddenLeft).toBe(0);
        expect(layout.hiddenRight).toBe(0);
    });

    it("squeezes cards closer before it starts scrolling", () => {
        const size = CARD_SIZES.large;
        const count = 10;
        const tight = (count - 1) * MIN_REVEAL + size.width + (size.width - MIN_REVEAL);
        const layout = layoutHand(hand.slice(0, count), 0, size, tight);
        expect(layout.hiddenLeft + layout.hiddenRight).toBe(0);
    });

    it("scrolls a long hand and always keeps the selected card in view", () => {
        const size = CARD_SIZES.small;
        for (let selected = 0; selected < hand.length; selected++) {
            const layout = layoutHand(hand, selected, size, 60);
            expect(layout.hiddenLeft).toBeLessThanOrEqual(selected);
            expect(layout.hiddenRight).toBeLessThanOrEqual(hand.length - 1 - selected);
            expect(layout.hiddenLeft + layout.hiddenRight).toBeGreaterThan(0);
        }
    });

    it("keeps the selection in range", () => {
        const layout = layoutHand(hand.slice(0, 3), 99, CARD_SIZES.small, 200);
        expect(toLines(layout.canvas)[0]!.trim().length).toBe(CARD_SIZES.small.width);
    });

    it("shows the color letter on overlapped cards, where it stays visible", () => {
        const size = CARD_SIZES.small;
        const cards = [redSeven, blueSkip, redSeven];
        const top = toLines(layoutHand(cards, 2, size, 200).canvas)[1]!;
        expect(top.slice(0, 2)).toBe("╭R");
        expect(top.slice(size.reveal, size.reveal + 2)).toBe("╭B");
    });

    it("does not repeat the letter on the last card, which is not overlapped", () => {
        const size = CARD_SIZES.small;
        const top = toLines(layoutHand([redSeven, blueSkip, redSeven], 0, size, 200).canvas)[1]!;
        expect(top.trimEnd().endsWith("╭──R─╮")).toBe(true);
    });

    it("handles an empty hand", () => {
        const layout = layoutHand([], 0, CARD_SIZES.small, 80);
        expect(canvasWidth(layout.canvas)).toBe(0);
    });
});
