import {describe, it, expect} from "vitest";
import {createDeck, shuffle} from "./deck";

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

describe("shuffle", () => {
    const deck = createDeck();
    const idsOf = (cards: {id: number}[]) => cards.map((c) => c.id);

    it("gives the same order for the same seed", () => {
        const a = shuffle(deck, 42);
        const b = shuffle(deck, 42);
        expect(idsOf(a.items)).toEqual(idsOf(b.items));
    });

    it("gives a different order for a different seed", () => {
        const a = shuffle(deck, 42);
        const b = shuffle(deck, 43);
        expect(idsOf(a.items)).not.toEqual(idsOf(b.items));
    });

    it("actually changes the order", () => {
        const {items} = shuffle(deck, 42);
        expect(idsOf(items)).not.toEqual(idsOf(deck));
    });

    it("keeps exactly the same cards", () => {
        const {items} = shuffle(deck, 42);
        const sorted = idsOf(items).sort((a, b) => a - b);
        expect(sorted).toEqual(idsOf(deck));
    });

    it("does not modify the input array", () => {
        const before = idsOf(deck);
        shuffle(deck, 42);
        expect(idsOf(deck)).toEqual(before);
    });

    it("returns a new rngState so the next shuffle differs", () => {
        const first = shuffle(deck, 42);
        expect(first.rngState).not.toBe(42);

        const second = shuffle(deck, first.rngState);
        expect(idsOf(second.items)).not.toEqual(idsOf(first.items));
    });

    it("handles empty and single-item arrays", () => {
        expect(shuffle([], 42).items).toEqual([]);
        expect(shuffle(["only"], 42).items).toEqual(["only"]);
    });
});
