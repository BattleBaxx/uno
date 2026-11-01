import {describe, it, expect} from "vitest";
import {apply, createLobby, type GameState, type PlayingState, type Result} from "@uno/engine";
import {viewFor, type PlayingView} from "./view";

function unwrap(result: Result): GameState {
    if (!result.ok) {
        throw new Error(`expected ok, got error "${result.error}"`);
    }
    return result.state;
}

function lobby(): GameState {
    const created = createLobby("alice", {handSize: 7});
    if (!created.ok) {
        throw new Error(created.error);
    }
    let state: GameState = created.state;
    state = unwrap(apply(state, {type: "join", playerId: "bob"}));
    state = unwrap(apply(state, {type: "join", playerId: "carol"}));
    return state;
}

function playing(): PlayingState {
    const state = unwrap(apply(lobby(), {type: "start", playerId: "alice", seed: 42}));
    if (state.phase !== "playing") {
        throw new Error("expected a started game");
    }
    return state;
}

function playingViewFor(state: PlayingState, playerId: string): PlayingView {
    const view = viewFor(state, playerId);
    if (view.phase !== "playing") {
        throw new Error("expected a playing view");
    }
    return view;
}

describe("viewFor in the lobby", () => {
    it("shows the players, host and settings", () => {
        expect(viewFor(lobby(), "bob")).toEqual({
            phase: "lobby",
            you: "bob",
            players: ["alice", "bob", "carol"],
            host: "alice",
            settings: {handSize: 7},
        });
    });
});

describe("viewFor during a game", () => {
    it("shows the player their own hand", () => {
        const state = playing();
        const view = playingViewFor(state, "bob");
        expect(view.you).toBe("bob");
        expect(view.hand).toEqual(state.players[1]!.hand);
    });

    it("only shows how many cards the other players have", () => {
        const view = playingViewFor(playing(), "bob");
        expect(view.players).toEqual([
            {id: "alice", cardCount: 7},
            {id: "bob", cardCount: 7},
            {id: "carol", cardCount: 7},
        ]);
    });

    it("never includes the draw pile, the discard pile, other hands or the random state", () => {
        const view = playingViewFor(playing(), "bob");
        const keys = Object.keys(view);
        expect(keys).not.toContain("drawPile");
        expect(keys).not.toContain("discardPile");
        expect(keys).not.toContain("rngState");
        for (const other of view.players) {
            expect(Object.keys(other)).toEqual(["id", "cardCount"]);
        }
    });

    it("does not leak other players' cards anywhere in the message", () => {
        const state = playing();
        const json = JSON.stringify(viewFor(state, "bob"));
        for (const card of [...state.players[0]!.hand, ...state.players[2]!.hand, ...state.drawPile]) {
            expect(json).not.toContain(`"id":${card.id},`);
        }
    });

    it("shows the table: whose turn, top card, color and counts", () => {
        const state = playing();
        const view = playingViewFor(state, "carol");
        expect(view.currentPlayer).toBe("alice");
        expect(view.topCard).toEqual(state.discardPile.at(-1));
        expect(view.currentColor).toBe(state.currentColor);
        expect(view.direction).toBe(1);
        expect(view.pendingDraw).toBe(0);
        expect(view.hasDrawn).toBe(false);
        expect(view.drawPileCount).toBe(108 - 21 - 1);
        expect(view.unoWindows).toEqual([]);
    });

    it("gives every player a different hand", () => {
        const state = playing();
        const hands = ["alice", "bob", "carol"].map((id) => playingViewFor(state, id).hand.map((c) => c.id));
        expect(new Set(hands.flat()).size).toBe(21);
    });
});

describe("viewFor after the game", () => {
    it("shows the winner", () => {
        expect(viewFor({phase: "finished", winner: "carol"}, "bob")).toEqual({
            phase: "finished",
            you: "bob",
            winner: "carol",
        });
    });
});
