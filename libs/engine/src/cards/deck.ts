import type {Card, Color, NumberCard} from "./card";

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
