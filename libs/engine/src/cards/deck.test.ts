import {describe, it, expect} from "vitest";
import {createDeck} from "./deck";

describe("createDeck", () => {
    const deck = createDeck();

    it("has 108 cards", () => {
        expect(deck.length).toBe(108);
    });

    it("gives every card a unique id", () => {
        const ids = deck.map((c) => c.id);
        expect(new Set(ids).size).toBe(108);
    });

    it("has the right number of each kind", () => {
        const count = (kind: string) => deck.filter((c) => c.kind === kind).length;

        expect(count("number")).toBe(76);
        expect(count("skip")).toBe(8);
        expect(count("reverse")).toBe(8);
        expect(count("drawTwo")).toBe(8);
        expect(count("wild")).toBe(4);
        expect(count("wildDrawFour")).toBe(4);
    });

    it("has 25 cards of each color", () => {
        for (const color of ["red", "yellow", "green", "blue"]) {
            const ofColor = deck.filter((c) => "color" in c && c.color === color);
            expect(ofColor.length).toBe(25);
        }
    });

    it("has one 0 and two of each 1–9 per color", () => {
        const numbers = deck.filter((c) => c.kind === "number");

        for (const color of ["red", "yellow", "green", "blue"]) {
            const values = numbers.filter((c) => c.color === color).map((c) => c.value);
            expect(values.filter((v) => v === 0).length).toBe(1);
            for (let v = 1; v <= 9; v++) {
                expect(values.filter((x) => x === v).length).toBe(2);
            }
        }
    });

    it("gives wild cards no color", () => {
        const wilds = deck.filter((c) => c.kind === "wild" || c.kind === "wildDrawFour");
        for (const card of wilds) {
            expect("color" in card).toBe(false);
        }
    });
});
