import type {Card, Color, NumberCard} from "./card";
import {nextRandom} from "../random";

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const ONE_TO_NINE: NumberCard["value"][] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function createDeck(): Card[] {
    const cards: Card[] = [];
    let nextId = 0;

    for (const color of COLORS) {
        cards.push({id: nextId++, kind: "number", color, value: 0});

        for (let copy = 0; copy < 2; copy++) {
            for (const value of ONE_TO_NINE) {
                cards.push({id: nextId++, kind: "number", color, value});
            }
            cards.push({id: nextId++, kind: "skip", color});
            cards.push({id: nextId++, kind: "reverse", color});
            cards.push({id: nextId++, kind: "drawTwo", color});
        }
    }

    for (let copy = 0; copy < 4; copy++) {
        cards.push({id: nextId++, kind: "wild"});
        cards.push({id: nextId++, kind: "wildDrawFour"});
    }

    return cards;
}

// Fisher–Yates shuffle.
export function shuffle<T>(items: T[], rngState: number): {items: T[]; rngState: number} {
    const result = [...items];
    let state = rngState;

    for (let i = result.length - 1; i > 0; i--) {
        const random = nextRandom(state);
        state = random.rngState;
        const j = Math.floor(random.value * (i + 1));

        // i and j are both within 0..length-1, so neither read can be undefined.
        const atI = result[i]!;
        const atJ = result[j]!;
        result[i] = atJ;
        result[j] = atI;
    }

    return {items: result, rngState: state};
}
