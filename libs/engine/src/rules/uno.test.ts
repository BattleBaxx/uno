import {describe, it, expect} from "vitest";
import {apply} from "../apply";
import type {PlayingState} from "../state";
import {drawTwo, game, handIds, num, skip, unwrap} from "./fixtures";

const onOneCard = (overrides: Partial<PlayingState> = {}) =>
    game({
        players: [
            {id: "alice", hand: [num(1, "red", 7)]},
            {id: "bob", hand: [num(11, "blue", 4), num(12, "red", 6)]},
            {id: "carol", hand: [num(21, "green", 8), num(22, "green", 1)]},
        ],
        drawPile: [num(90, "blue", 1), num(91, "blue", 2), num(92, "blue", 3), num(93, "blue", 4), num(94, "blue", 5)],
        unoWindows: [{playerId: "alice", openedAt: 1000}],
        ...overrides,
    });

describe("opening a window", () => {
    it("opens when a player plays down to one card", () => {
        const state = game({players: [{id: "alice", hand: [num(1, "red", 7), num(2, "green", 5)]}, ...game().players.slice(1)]});
        const after = unwrap(apply(state, {type: "play", playerId: "alice", cardId: 1, now: 1000}));
        expect(after.unoWindows).toEqual([{playerId: "alice", openedAt: 1000}]);
    });

    it("does not open while the player still has more than one card", () => {
        const after = unwrap(apply(game(), {type: "play", playerId: "alice", cardId: 1, now: 1000}));
        expect(after.unoWindows).toEqual([]);
    });

    it("stays open while play continues", () => {
        const state = onOneCard({
            currentPlayerIndex: 1,
            players: [
                {id: "alice", hand: [num(1, "red", 7)]},
                {id: "bob", hand: [num(11, "blue", 4), num(12, "red", 6), num(13, "blue", 9)]},
                {id: "carol", hand: [num(21, "green", 8), num(22, "green", 1)]},
            ],
        });
        const after = unwrap(apply(state, {type: "play", playerId: "bob", cardId: 12, now: 5000}));
        expect(after.unoWindows).toEqual([{playerId: "alice", openedAt: 1000}]);
    });

    it("closes when the player draws", () => {
        const state = onOneCard({players: [{id: "alice", hand: [num(1, "yellow", 2)]}, ...onOneCard().players.slice(1)]});
        const after = unwrap(apply(state, {type: "draw", playerId: "alice"}));
        expect(after.unoWindows).toEqual([]);
    });
});

describe("callUno", () => {
    it("saves the player when they call their own UNO, even inside the head start", () => {
        const after = unwrap(apply(onOneCard(), {type: "callUno", playerId: "alice", now: 1500}));
        expect(after.unoWindows).toEqual([]);
        expect(handIds(after, 0)).toEqual([1]);
    });

    it("ignores other players during the 3 second head start", () => {
        const state = onOneCard();
        expect(apply(state, {type: "callUno", playerId: "bob", now: 3999})).toEqual({ok: true, state, events: []});
    });

    it("catches the player once the head start is over", () => {
        const after = unwrap(apply(onOneCard(), {type: "callUno", playerId: "bob", now: 4000}));
        expect(handIds(after, 0)).toEqual([1, 94, 93, 92, 91]);
        expect(handIds(after, 1)).toEqual([11, 12]);
        expect(after.unoWindows).toEqual([]);
    });

    it("catches everyone past their head start in one call", () => {
        const state = onOneCard({
            players: [
                {id: "alice", hand: [num(1, "red", 7)]},
                {id: "bob", hand: [num(11, "blue", 4)]},
                {id: "carol", hand: [num(21, "green", 8), num(22, "green", 1)]},
            ],
            drawPile: Array.from({length: 10}, (_, i) => num(90 + i, "blue", 1)),
            unoWindows: [
                {playerId: "alice", openedAt: 1000},
                {playerId: "bob", openedAt: 2000},
            ],
        });
        const after = unwrap(apply(state, {type: "callUno", playerId: "carol", now: 10_000}));
        expect(after.players[0]!.hand.length).toBe(5);
        expect(after.players[1]!.hand.length).toBe(5);
        expect(after.unoWindows).toEqual([]);
    });

    it("only catches the windows that are past their head start", () => {
        const state = onOneCard({
            players: [
                {id: "alice", hand: [num(1, "red", 7)]},
                {id: "bob", hand: [num(11, "blue", 4)]},
                {id: "carol", hand: [num(21, "green", 8), num(22, "green", 1)]},
            ],
            unoWindows: [
                {playerId: "alice", openedAt: 1000},
                {playerId: "bob", openedAt: 9000},
            ],
        });
        const after = unwrap(apply(state, {type: "callUno", playerId: "carol", now: 10_000}));
        expect(after.players[0]!.hand.length).toBe(5);
        expect(after.players[1]!.hand.length).toBe(1);
        expect(after.unoWindows).toEqual([{playerId: "bob", openedAt: 9000}]);
    });

    it("with their own window open, a call only saves the caller", () => {
        const state = onOneCard({
            players: [
                {id: "alice", hand: [num(1, "red", 7)]},
                {id: "bob", hand: [num(11, "blue", 4)]},
                {id: "carol", hand: [num(21, "green", 8)]},
            ],
            unoWindows: [
                {playerId: "alice", openedAt: 1000},
                {playerId: "bob", openedAt: 2000},
            ],
        });
        const after = unwrap(apply(state, {type: "callUno", playerId: "bob", now: 10_000}));
        expect(after.unoWindows).toEqual([{playerId: "alice", openedAt: 1000}]);
        expect(after.players[0]!.hand.length).toBe(1);
    });

    it("penalizes a false call when no window is open", () => {
        const after = unwrap(apply(onOneCard({unoWindows: []}), {type: "callUno", playerId: "carol", now: 5000}));
        expect(handIds(after, 2)).toEqual([21, 22, 94, 93, 92, 91]);
    });

    it("rejects a call from someone who is not in the game", () => {
        expect(apply(onOneCard(), {type: "callUno", playerId: "zed", now: 5000})).toEqual({ok: false, error: "notInGame"});
    });
});

describe("unoTimeout", () => {
    it("penalizes the player once 30 seconds have passed", () => {
        const after = unwrap(apply(onOneCard(), {type: "unoTimeout", playerId: "alice", now: 31_000}));
        expect(handIds(after, 0)).toEqual([1, 94, 93, 92, 91]);
        expect(after.unoWindows).toEqual([]);
    });

    it("does nothing if the 30 seconds are not up yet", () => {
        const state = onOneCard();
        expect(apply(state, {type: "unoTimeout", playerId: "alice", now: 30_999})).toEqual({ok: true, state, events: []});
    });

    it("does nothing if the window was already closed", () => {
        const state = onOneCard({unoWindows: []});
        expect(apply(state, {type: "unoTimeout", playerId: "alice", now: 60_000})).toEqual({ok: true, state, events: []});
    });
});

describe("playing the last card", () => {
    it("wins if UNO was called", () => {
        const called = unwrap(apply(onOneCard(), {type: "callUno", playerId: "alice", now: 1500}));
        expect(apply(called, {type: "play", playerId: "alice", cardId: 1, now: 2000})).toEqual({
            ok: true,
            state: {phase: "finished", winner: "alice"},
            events: [
                {type: "played", playerId: "alice", card: num(1, "red", 7), color: "red"},
                {type: "won", playerId: "alice"},
            ],
        });
    });

    it("without calling UNO, draws the penalty and loses the turn instead", () => {
        const after = unwrap(apply(onOneCard(), {type: "play", playerId: "alice", cardId: 1, now: 2000}));
        expect(handIds(after, 0)).toEqual([1, 94, 93, 92, 91]);
        expect(after.discardPile.map((c) => c.id)).toEqual([80]);
        expect(after.currentPlayerIndex).toBe(1);
        expect(after.unoWindows).toEqual([]);
    });

    it("without calling UNO during a stack, also draws the stack", () => {
        const state = onOneCard({
            players: [{id: "alice", hand: [drawTwo(1, "red")]}, ...onOneCard().players.slice(1)],
            discardPile: [drawTwo(80, "blue")],
            drawPile: Array.from({length: 10}, (_, i) => num(90 + i, "blue", 1)),
            pendingDraw: 2,
        });
        const after = unwrap(apply(state, {type: "play", playerId: "alice", cardId: 1, now: 2000}));
        expect(after.players[0]!.hand.length).toBe(7);
        expect(after.pendingDraw).toBe(0);
        expect(after.currentPlayerIndex).toBe(1);
    });

    it("a 2-player skip gives another turn, and the last card still needs UNO", () => {
        const state = game({
            players: [
                {id: "alice", hand: [skip(1, "red"), num(2, "red", 7)]},
                {id: "bob", hand: [num(11, "blue", 4)]},
            ],
        });
        const skipped = unwrap(apply(state, {type: "play", playerId: "alice", cardId: 1, now: 1000}));
        expect(skipped.currentPlayerIndex).toBe(0);
        const after = unwrap(apply(skipped, {type: "play", playerId: "alice", cardId: 2, now: 1500}));
        expect(after.players[0]!.hand.length).toBe(5);
    });

    it("cannot be done in the lobby", () => {
        const lobby = {phase: "lobby" as const, players: ["alice"], host: "alice", settings: {handSize: 7}};
        expect(apply(lobby, {type: "callUno", playerId: "alice", now: 0})).toEqual({ok: false, error: "wrongPhase"});
    });
});
