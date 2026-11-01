import type {Card, Color, NumberCard} from "../cards/card";
import type {Result} from "../result";
import type {PlayingState} from "../state";

export const num = (id: number, color: Color, value: NumberCard["value"]): Card => ({id, kind: "number", color, value});
export const skip = (id: number, color: Color): Card => ({id, kind: "skip", color});
export const reverse = (id: number, color: Color): Card => ({id, kind: "reverse", color});
export const drawTwo = (id: number, color: Color): Card => ({id, kind: "drawTwo", color});
export const wild = (id: number): Card => ({id, kind: "wild"});
export const wildDrawFour = (id: number): Card => ({id, kind: "wildDrawFour"});

export function game(overrides: Partial<PlayingState> = {}): PlayingState {
    return {
        phase: "playing",
        rngState: 1,
        drawPile: [num(90, "blue", 1), num(91, "blue", 2), num(92, "blue", 3)],
        discardPile: [num(80, "red", 5)],
        currentColor: "red",
        players: [
            {id: "alice", hand: [num(1, "red", 7), num(2, "green", 5), num(3, "yellow", 9)]},
            {id: "bob", hand: [num(11, "blue", 4), num(12, "blue", 6)]},
            {id: "carol", hand: [num(21, "green", 8), num(22, "green", 1)]},
        ],
        currentPlayerIndex: 0,
        hasDrawn: false,
        direction: 1,
        pendingDraw: 0,
        unoWindows: [],
        ...overrides,
    };
}

export function unwrap(result: Result): PlayingState {
    if (!result.ok) {
        throw new Error(`expected ok, got error "${result.error}"`);
    }
    if (result.state.phase !== "playing") {
        throw new Error(`expected playing, got ${result.state.phase}`);
    }
    return result.state;
}

export const handIds = (state: PlayingState, index: number) => state.players[index]!.hand.map((c) => c.id);
export const topCard = (state: PlayingState) => state.discardPile.at(-1);
