import {describe, it, expect} from "vitest";
import {apply} from "./apply";
import {createLobby, MAX_PLAYERS} from "./lobby";
import type {Result} from "./result";
import type {GameState, LobbyState, PlayingState} from "./state";

function unwrap<S>(result: Result<S>): S {
    if (!result.ok) {
        throw new Error(`expected ok, got error "${result.error}"`);
    }
    return result.state;
}

function lobbyWith(players: string[], handSize = 7): LobbyState {
    const [host, ...others] = players;
    let state: GameState = unwrap(createLobby(host!, {handSize}));
    for (const id of others) {
        state = unwrap(apply(state, {type: "join", playerId: id}));
    }
    return state as LobbyState;
}

function startedGame(players: string[], seed = 42, handSize = 7): PlayingState {
    const lobby = lobbyWith(players, handSize);
    return unwrap(apply(lobby, {type: "start", playerId: players[0]!, seed})) as PlayingState;
}

describe("createLobby", () => {
    it("makes the host the first and only player", () => {
        const lobby = unwrap(createLobby("alice", {handSize: 7}));
        expect(lobby.phase).toBe("lobby");
        expect(lobby.host).toBe("alice");
        expect(lobby.players).toEqual(["alice"]);
    });

    it("rejects hand sizes outside 1–20 and non-whole numbers", () => {
        for (const handSize of [0, 21, -3, 7.5]) {
            expect(createLobby("alice", {handSize})).toEqual({ok: false, error: "invalidHandSize"});
        }
    });

    it("accepts the edge hand sizes 1 and 20", () => {
        expect(createLobby("alice", {handSize: 1}).ok).toBe(true);
        expect(createLobby("alice", {handSize: 20}).ok).toBe(true);
    });
});

describe("join", () => {
    it("adds the player in join order", () => {
        const lobby = lobbyWith(["alice", "bob", "carol"]);
        expect(lobby.players).toEqual(["alice", "bob", "carol"]);
    });

    it("rejects a player who already joined", () => {
        const lobby = lobbyWith(["alice", "bob"]);
        expect(apply(lobby, {type: "join", playerId: "bob"})).toEqual({ok: false, error: "alreadyJoined"});
    });

    it("rejects a 5th player", () => {
        const lobby = lobbyWith(["alice", "bob", "carol", "dave"]);
        expect(lobby.players.length).toBe(MAX_PLAYERS);
        expect(apply(lobby, {type: "join", playerId: "erin"})).toEqual({ok: false, error: "roomFull"});
    });

    it("rejects joining after the game started", () => {
        const game = startedGame(["alice", "bob"]);
        expect(apply(game, {type: "join", playerId: "carol"})).toEqual({ok: false, error: "wrongPhase"});
    });

    it("does not modify the old state", () => {
        const lobby = lobbyWith(["alice"]);
        apply(lobby, {type: "join", playerId: "bob"});
        expect(lobby.players).toEqual(["alice"]);
    });
});

describe("start", () => {
    it("can only be done by the host", () => {
        const lobby = lobbyWith(["alice", "bob"]);
        expect(apply(lobby, {type: "start", playerId: "bob", seed: 1})).toEqual({ok: false, error: "notHost"});
    });

    it("needs at least 2 players", () => {
        const lobby = lobbyWith(["alice"]);
        expect(apply(lobby, {type: "start", playerId: "alice", seed: 1})).toEqual({
            ok: false,
            error: "notEnoughPlayers",
        });
    });

    it("cannot start twice", () => {
        const game = startedGame(["alice", "bob"]);
        expect(apply(game, {type: "start", playerId: "alice", seed: 1})).toEqual({ok: false, error: "wrongPhase"});
    });

    it("deals handSize cards to every player, in join order", () => {
        const game = startedGame(["alice", "bob", "carol"], 42, 5);
        expect(game.players.map((p) => p.id)).toEqual(["alice", "bob", "carol"]);
        for (const player of game.players) {
            expect(player.hand.length).toBe(5);
        }
    });

    it("keeps all 108 cards, each exactly once", () => {
        const game = startedGame(["alice", "bob", "carol", "dave"], 42, 20);
        const all = [...game.drawPile, ...game.discardPile, ...game.players.flatMap((p) => p.hand)];
        expect(all.length).toBe(108);
        expect(new Set(all.map((c) => c.id)).size).toBe(108);
    });

    it("sets up the first turn", () => {
        const game = startedGame(["alice", "bob"]);
        expect(game.phase).toBe("playing");
        expect(game.currentPlayerIndex).toBe(0);
        expect(game.direction).toBe(1);
        expect(game.hasDrawn).toBe(false);
        expect(game.pendingDraw).toBe(0);
        expect(game.unoWindows).toEqual([]);
        expect(game.discardPile.length).toBe(1);
    });

    // About 30% of cards are action/wild cards, so 200 seeds definitely hit the
    // "put it back and flip again" path many times.
    it("always flips a number card first, and sets the current color from it", () => {
        for (let seed = 0; seed < 200; seed++) {
            const game = startedGame(["alice", "bob"], seed);
            const first = game.discardPile[0]!;
            expect(first.kind).toBe("number");
            expect("color" in first && first.color).toBe(game.currentColor);
        }
    });

    it("deals the same game for the same seed", () => {
        expect(startedGame(["alice", "bob"], 7)).toEqual(startedGame(["alice", "bob"], 7));
    });

    it("deals a different game for a different seed", () => {
        expect(startedGame(["alice", "bob"], 7)).not.toEqual(startedGame(["alice", "bob"], 8));
    });
});

describe("apply", () => {
    it("reports actions that are not written yet", () => {
        const game = startedGame(["alice", "bob"]);
        expect(apply(game, {type: "callUno", playerId: "alice", now: 0})).toEqual({ok: false, error: "notImplemented"});
    });
});
