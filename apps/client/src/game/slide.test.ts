import {describe, it, expect} from "vitest";
import {createDeck} from "@uno/engine";
import {isSliding, SLIDE_MS, slidePosition, slideProgress, type Slide} from "./slide";

const [card, under] = createDeck();
const slide: Slide = {card: card!, playerId: "a", under: under!, startedAt: 1000};

describe("slideProgress", () => {
    it("goes from 0 to 1 over the slide", () => {
        expect(slideProgress(slide, 1000)).toBe(0);
        expect(slideProgress(slide, 1000 + SLIDE_MS)).toBe(1);
        expect(slideProgress(slide, 99_999)).toBe(1);
    });

    it("starts fast and slows down as it lands", () => {
        const half = slideProgress(slide, 1000 + SLIDE_MS / 2);
        expect(half).toBeGreaterThan(0.5);
        expect(half).toBeLessThan(1);
    });
});

describe("slidePosition", () => {
    it("moves in a straight line from the seat to the pile", () => {
        const from = {x: 0, y: 20};
        const to = {x: 40, y: 10};
        expect(slidePosition(from, to, 0)).toEqual(from);
        expect(slidePosition(from, to, 1)).toEqual(to);
        expect(slidePosition(from, to, 0.5)).toEqual({x: 20, y: 15});
    });
});

describe("isSliding", () => {
    it("is only true while the slide runs", () => {
        expect(isSliding(slide, 1000 + SLIDE_MS - 1)).toBe(true);
        expect(isSliding(slide, 1000 + SLIDE_MS)).toBe(false);
        expect(isSliding(null, 0)).toBe(false);
    });
});
