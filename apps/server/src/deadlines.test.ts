import {describe, it, expect} from "vitest";
import {UNO_WINDOW_MS, type PlayingState} from "@uno/engine";
import {nextDeadline} from "./deadlines";

const playing = (unoWindows: PlayingState["unoWindows"]): PlayingState => ({
    phase: "playing",
    rngState: 1,
    drawPile: [],
    discardPile: [{id: 1, kind: "number", color: "red", value: 5}],
    currentColor: "red",
    players: [],
    currentPlayerIndex: 0,
    hasDrawn: false,
    direction: 1,
    pendingDraw: 0,
    unoWindows,
});

describe("nextDeadline", () => {
    it("is the countdown end in a counting lobby", () => {
        expect(
            nextDeadline({phase: "lobby", players: ["a", "b"], host: "a", settings: {handSize: 7}, startsAt: 3000}),
        ).toBe(3000);
    });

    it("is nothing in an idle lobby", () => {
        expect(
            nextDeadline({phase: "lobby", players: ["a"], host: "a", settings: {handSize: 7}, startsAt: null}),
        ).toBeNull();
    });

    it("is the earliest UNO window to time out", () => {
        const state = playing([
            {playerId: "a", openedAt: 5000},
            {playerId: "b", openedAt: 2000},
        ]);
        expect(nextDeadline(state)).toBe(2000 + UNO_WINDOW_MS);
    });

    it("is nothing when no UNO window is open or the game is over", () => {
        expect(nextDeadline(playing([]))).toBeNull();
        expect(nextDeadline({phase: "finished", winner: "a"})).toBeNull();
    });
});
