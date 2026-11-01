import {describe, it, expect} from "vitest";
import {apply} from "../apply";
import type {LobbyState, PlayingState} from "../state";
import {drawTwo, game, num, unwrap} from "./fixtures";

const lobby = (): LobbyState => ({phase: "lobby", players: ["alice", "bob", "carol"], host: "alice", settings: {handSize: 7}});

const currentId = (state: PlayingState) => state.players[state.currentPlayerIndex]!.id;

const fourPlayers = (overrides: Partial<PlayingState> = {}) =>
    game({
        players: [
            {id: "alice", hand: [num(1, "red", 7)]},
            {id: "bob", hand: [num(11, "blue", 4), num(12, "blue", 6)]},
            {id: "carol", hand: [num(21, "green", 8)]},
            {id: "dave", hand: [num(31, "yellow", 2)]},
        ],
        ...overrides,
    });

describe("removePlayer in the lobby", () => {
    it("removes the player", () => {
        const result = apply(lobby(), {type: "removePlayer", playerId: "bob"});
        expect(result).toEqual({
            ok: true,
            state: {...lobby(), players: ["alice", "carol"]},
            events: [{type: "removed", playerId: "bob"}],
        });
    });

    it("hands the host role to the next player in join order", () => {
        const result = apply(lobby(), {type: "removePlayer", playerId: "alice"});
        expect(result).toEqual({
            ok: true,
            state: {...lobby(), players: ["bob", "carol"], host: "bob"},
            events: [
                {type: "removed", playerId: "alice"},
                {type: "hostChanged", playerId: "bob"},
            ],
        });
    });

    it("leaves an empty lobby when the last player goes", () => {
        const alone: LobbyState = {...lobby(), players: ["alice"]};
        const result = apply(alone, {type: "removePlayer", playerId: "alice"});
        expect(result).toEqual({ok: true, state: {...alone, players: []}, events: [{type: "removed", playerId: "alice"}]});
    });

    it("rejects a player who is not in the room", () => {
        expect(apply(lobby(), {type: "removePlayer", playerId: "zed"})).toEqual({ok: false, error: "notInGame"});
    });
});

describe("removePlayer during a game", () => {
    it("shuffles the removed player's cards into the draw pile", () => {
        const state = fourPlayers();
        const after = unwrap(apply(state, {type: "removePlayer", playerId: "bob"}));
        expect(after.players.map((p) => p.id)).toEqual(["alice", "carol", "dave"]);
        expect(after.drawPile.length).toBe(state.drawPile.length + 2);
        expect(after.drawPile.map((c) => c.id).sort((a, b) => a - b)).toEqual([11, 12, 90, 91, 92]);
        expect(after.rngState).not.toBe(state.rngState);
    });

    it("keeps the same current player when someone before them leaves", () => {
        const after = unwrap(apply(fourPlayers({currentPlayerIndex: 2}), {type: "removePlayer", playerId: "bob"}));
        expect(currentId(after)).toBe("carol");
    });

    it("keeps the same current player when someone after them leaves", () => {
        const after = unwrap(apply(fourPlayers({currentPlayerIndex: 1}), {type: "removePlayer", playerId: "dave"}));
        expect(currentId(after)).toBe("bob");
    });

    it("passes the turn to the next player when the current player leaves", () => {
        const after = unwrap(apply(fourPlayers({currentPlayerIndex: 1, hasDrawn: true}), {type: "removePlayer", playerId: "bob"}));
        expect(currentId(after)).toBe("carol");
        expect(after.hasDrawn).toBe(false);
    });

    it("wraps around when the last seat's player leaves on their turn", () => {
        const after = unwrap(apply(fourPlayers({currentPlayerIndex: 3}), {type: "removePlayer", playerId: "dave"}));
        expect(currentId(after)).toBe("alice");
    });

    it("follows a reversed direction when the current player leaves", () => {
        const state = fourPlayers({currentPlayerIndex: 1, direction: -1});
        const after = unwrap(apply(state, {type: "removePlayer", playerId: "bob"}));
        expect(currentId(after)).toBe("alice");
    });

    it("follows a reversed direction when the first seat's player leaves on their turn", () => {
        const state = fourPlayers({currentPlayerIndex: 0, direction: -1});
        const after = unwrap(apply(state, {type: "removePlayer", playerId: "alice"}));
        expect(currentId(after)).toBe("dave");
    });

    it("clears a penalty stack that was waiting on the removed player", () => {
        const state = fourPlayers({currentPlayerIndex: 1, pendingDraw: 4, discardPile: [drawTwo(80, "red")]});
        const after = unwrap(apply(state, {type: "removePlayer", playerId: "bob"}));
        expect(after.pendingDraw).toBe(0);
    });

    it("keeps a penalty stack that is waiting on someone else", () => {
        const state = fourPlayers({currentPlayerIndex: 1, pendingDraw: 4, discardPile: [drawTwo(80, "red")]});
        const after = unwrap(apply(state, {type: "removePlayer", playerId: "dave"}));
        expect(after.pendingDraw).toBe(4);
    });

    it("closes the removed player's UNO window", () => {
        const state = fourPlayers({unoWindows: [{playerId: "alice", openedAt: 0}, {playerId: "carol", openedAt: 0}]});
        const after = unwrap(apply(state, {type: "removePlayer", playerId: "alice"}));
        expect(after.unoWindows).toEqual([{playerId: "carol", openedAt: 0}]);
    });

    it("makes the last remaining player the winner", () => {
        const state = game({players: game().players.slice(0, 2)});
        expect(apply(state, {type: "removePlayer", playerId: "bob"})).toEqual({
            ok: true,
            state: {phase: "finished", winner: "alice"},
            events: [
                {type: "removed", playerId: "bob"},
                {type: "won", playerId: "alice"},
            ],
        });
    });

    it("rejects a player who is not in the game", () => {
        expect(apply(fourPlayers(), {type: "removePlayer", playerId: "zed"})).toEqual({ok: false, error: "notInGame"});
    });

    it("cannot be done after the game is over", () => {
        expect(apply({phase: "finished", winner: "alice"}, {type: "removePlayer", playerId: "bob"})).toEqual({
            ok: false,
            error: "wrongPhase",
        });
    });
});
