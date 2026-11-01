import {describe, it, expect} from "vitest";
import {apply} from "../apply";
import type {Card} from "../cards/card";
import type {FinishedState, PlayingState} from "../state";
import {drawTwo, game, handIds, num, reverse, skip, topCard, unwrap, wild, wildDrawFour} from "./fixtures";

describe("play", () => {
    it("plays a card matching the current color and passes the turn", () => {
        const after = unwrap(apply(game(), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(topCard(after)?.id).toBe(1);
        expect(handIds(after, 0)).toEqual([2, 3]);
        expect(after.currentPlayerIndex).toBe(1);
    });

    it("plays a card matching the top card's number in another color", () => {
        const after = unwrap(apply(game(), {type: "play", playerId: "alice", cardId: 2, now: 0}));
        expect(topCard(after)?.id).toBe(2);
        expect(after.currentColor).toBe("green");
    });

    it("rejects a card that matches neither color nor number", () => {
        expect(apply(game(), {type: "play", playerId: "alice", cardId: 3, now: 0})).toEqual({
            ok: false,
            error: "cardNotPlayable",
        });
    });

    it("rejects a play out of turn", () => {
        expect(apply(game(), {type: "play", playerId: "bob", cardId: 11, now: 0})).toEqual({
            ok: false,
            error: "notYourTurn",
        });
    });

    it("rejects a card the player does not hold", () => {
        expect(apply(game(), {type: "play", playerId: "alice", cardId: 11, now: 0})).toEqual({
            ok: false,
            error: "cardNotInHand",
        });
    });

    it("matches a symbol across colors (skip on skip)", () => {
        const state = game({
            discardPile: [skip(80, "blue")],
            currentColor: "blue",
            players: [{id: "alice", hand: [skip(1, "red"), num(2, "red", 1)]}, {id: "bob", hand: [num(11, "red", 2)]}],
        });
        expect(apply(state, {type: "play", playerId: "alice", cardId: 1, now: 0}).ok).toBe(true);
    });

    it("wraps the turn around from the last player to the first", () => {
        const state = game({currentPlayerIndex: 2, discardPile: [num(80, "green", 5)], currentColor: "green"});
        const after = unwrap(apply(state, {type: "play", playerId: "carol", cardId: 21, now: 0}));
        expect(after.currentPlayerIndex).toBe(0);
    });

    it("wraps backwards when the direction is reversed", () => {
        const after = unwrap(apply(game({direction: -1}), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(after.currentPlayerIndex).toBe(2);
    });

    it("ends the game when the last card is played", () => {
        const state = game({
            players: [{id: "alice", hand: [num(1, "red", 7)]}, {id: "bob", hand: [num(11, "blue", 4)]}],
        });
        const result = apply(state, {type: "play", playerId: "alice", cardId: 1, now: 0});
        expect(result).toEqual({ok: true, state: {phase: "finished", winner: "alice"} satisfies FinishedState});
    });

    it("cannot be done before the game starts", () => {
        const lobby = {phase: "lobby" as const, players: ["alice"], host: "alice", settings: {handSize: 7}};
        expect(apply(lobby, {type: "play", playerId: "alice", cardId: 1, now: 0})).toEqual({
            ok: false,
            error: "wrongPhase",
        });
    });

    it("does not modify the old state", () => {
        const state = game();
        apply(state, {type: "play", playerId: "alice", cardId: 1, now: 0});
        expect(state).toEqual(game());
    });
});

describe("wild", () => {
    const withWild = () => game({players: [{id: "alice", hand: [wild(1), num(2, "red", 1)]}, ...game().players.slice(1)]});

    it("needs a color", () => {
        expect(apply(withWild(), {type: "play", playerId: "alice", cardId: 1, now: 0})).toEqual({
            ok: false,
            error: "colorRequired",
        });
    });

    it("sets the chosen color, which the next player must follow", () => {
        const after = unwrap(apply(withWild(), {type: "play", playerId: "alice", cardId: 1, color: "blue", now: 0}));
        expect(after.currentColor).toBe("blue");
        expect(apply(after, {type: "play", playerId: "bob", cardId: 11, now: 0}).ok).toBe(true);
    });
});

describe("skip and reverse", () => {
    const aliceHolds = (card: Card, playerCount: number) => {
        const others = game().players.slice(1, playerCount);
        return game({players: [{id: "alice", hand: [card, num(2, "red", 1)]}, ...others]});
    };

    it("skip jumps over the next player", () => {
        const after = unwrap(apply(aliceHolds(skip(1, "red"), 3), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(after.currentPlayerIndex).toBe(2);
    });

    it("skip with 2 players gives the same player another turn", () => {
        const after = unwrap(apply(aliceHolds(skip(1, "red"), 2), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(after.currentPlayerIndex).toBe(0);
    });

    it("reverse flips the direction and goes the other way", () => {
        const after = unwrap(apply(aliceHolds(reverse(1, "red"), 3), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(after.direction).toBe(-1);
        expect(after.currentPlayerIndex).toBe(2);
    });

    it("reverse with 2 players acts as a skip", () => {
        const after = unwrap(apply(aliceHolds(reverse(1, "red"), 2), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(after.direction).toBe(1);
        expect(after.currentPlayerIndex).toBe(0);
    });
});

describe("penalty stacks", () => {
    const stackGame = (overrides: Partial<PlayingState> = {}) =>
        game({
            players: [
                {id: "alice", hand: [drawTwo(1, "red"), wildDrawFour(2), num(3, "red", 1)]},
                {id: "bob", hand: [drawTwo(11, "blue"), wildDrawFour(12), num(13, "red", 2)]},
                {id: "carol", hand: [num(21, "green", 8)]},
            ],
            drawPile: [num(90, "blue", 1), num(91, "blue", 2), num(92, "blue", 3), num(93, "blue", 4), num(94, "blue", 5)],
            ...overrides,
        });

    it("+2 starts a stack of 2 and passes the turn", () => {
        const after = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(after.pendingDraw).toBe(2);
        expect(after.currentPlayerIndex).toBe(1);
    });

    it("+2 stacks on +2 across colors", () => {
        const first = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        const second = unwrap(apply(first, {type: "play", playerId: "bob", cardId: 11, now: 0}));
        expect(second.pendingDraw).toBe(4);
        expect(second.currentColor).toBe("blue");
        expect(second.currentPlayerIndex).toBe(2);
    });

    it("the player who cannot stack draws the whole stack and loses their turn", () => {
        const first = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        const second = unwrap(apply(first, {type: "play", playerId: "bob", cardId: 11, now: 0}));
        const after = unwrap(apply(second, {type: "draw", playerId: "carol"}));
        expect(handIds(after, 2)).toEqual([21, 94, 93, 92, 91]);
        expect(after.pendingDraw).toBe(0);
        expect(after.currentPlayerIndex).toBe(0);
    });

    it("only allows stacking or drawing while a stack is pending", () => {
        const first = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(apply(first, {type: "play", playerId: "bob", cardId: 13, now: 0})).toEqual({
            ok: false,
            error: "cardNotPlayable",
        });
        expect(apply(first, {type: "pass", playerId: "bob"})).toEqual({ok: false, error: "mustDrawFirst"});
    });

    it("does not allow +4 on a +2 stack", () => {
        const first = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(apply(first, {type: "play", playerId: "bob", cardId: 12, color: "red", now: 0})).toEqual({
            ok: false,
            error: "cardNotPlayable",
        });
    });

    it("does not allow +2 on a +4 stack", () => {
        const first = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 2, color: "blue", now: 0}));
        expect(apply(first, {type: "play", playerId: "bob", cardId: 11, now: 0})).toEqual({
            ok: false,
            error: "cardNotPlayable",
        });
    });

    it("+4 needs a color", () => {
        expect(apply(stackGame(), {type: "play", playerId: "alice", cardId: 2, now: 0})).toEqual({
            ok: false,
            error: "colorRequired",
        });
    });

    it("+4 sets the color and starts a stack of 4", () => {
        const after = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 2, color: "green", now: 0}));
        expect(after.currentColor).toBe("green");
        expect(after.pendingDraw).toBe(4);
    });

    it("+4 stacks on +4 and the last player's color wins", () => {
        const first = unwrap(apply(stackGame(), {type: "play", playerId: "alice", cardId: 2, color: "green", now: 0}));
        const second = unwrap(apply(first, {type: "play", playerId: "bob", cardId: 12, color: "yellow", now: 0}));
        expect(second.pendingDraw).toBe(8);
        expect(second.currentColor).toBe("yellow");
    });

    it("after a +4 stack is drawn, the next player follows the chosen color", () => {
        const state = stackGame({
            players: [
                {id: "alice", hand: [wildDrawFour(2), num(3, "red", 1)]},
                {id: "bob", hand: [num(13, "red", 2)]},
                {id: "carol", hand: [num(21, "green", 8), num(22, "red", 9)]},
            ],
        });
        const played = unwrap(apply(state, {type: "play", playerId: "alice", cardId: 2, color: "green", now: 0}));
        const drawn = unwrap(apply(played, {type: "draw", playerId: "bob"}));
        expect(drawn.currentPlayerIndex).toBe(2);
        expect(apply(drawn, {type: "play", playerId: "carol", cardId: 22, now: 0})).toEqual({
            ok: false,
            error: "cardNotPlayable",
        });
        expect(apply(drawn, {type: "play", playerId: "carol", cardId: 21, now: 0}).ok).toBe(true);
    });

    it("a +2 on a +2 whose stack was already drawn starts a new stack", () => {
        const state = stackGame({discardPile: [drawTwo(80, "green")], currentColor: "green", pendingDraw: 0});
        const after = unwrap(apply(state, {type: "play", playerId: "alice", cardId: 1, now: 0}));
        expect(after.pendingDraw).toBe(2);
    });

    it("a +2 can be the winning card", () => {
        const state = stackGame({
            players: [{id: "alice", hand: [drawTwo(1, "red")]}, {id: "bob", hand: [num(13, "red", 2)]}],
        });
        expect(apply(state, {type: "play", playerId: "alice", cardId: 1, now: 0})).toEqual({
            ok: true,
            state: {phase: "finished", winner: "alice"},
        });
    });
});

describe("draw", () => {
    it("takes the top card and keeps the turn when the player can play", () => {
        const after = unwrap(apply(game(), {type: "draw", playerId: "alice"}));
        expect(handIds(after, 0)).toEqual([1, 2, 3, 92]);
        expect(after.drawPile.map((c) => c.id)).toEqual([90, 91]);
        expect(after.hasDrawn).toBe(true);
        expect(after.currentPlayerIndex).toBe(0);
    });

    it("ends the turn automatically when nothing is playable after drawing", () => {
        const state = game({players: [{id: "alice", hand: [num(3, "yellow", 9)]}, ...game().players.slice(1)]});
        const after = unwrap(apply(state, {type: "draw", playerId: "alice"}));
        expect(handIds(after, 0)).toEqual([3, 92]);
        expect(after.currentPlayerIndex).toBe(1);
        expect(after.hasDrawn).toBe(false);
    });

    it("lets the player play any playable card after drawing", () => {
        const drawn = unwrap(apply(game(), {type: "draw", playerId: "alice"}));
        expect(apply(drawn, {type: "play", playerId: "alice", cardId: 1, now: 0}).ok).toBe(true);
    });

    it("can only be done once per turn", () => {
        const drawn = unwrap(apply(game(), {type: "draw", playerId: "alice"}));
        expect(apply(drawn, {type: "draw", playerId: "alice"})).toEqual({ok: false, error: "alreadyDrawn"});
    });

    it("rejects a draw out of turn", () => {
        expect(apply(game(), {type: "draw", playerId: "bob"})).toEqual({ok: false, error: "notYourTurn"});
    });

    it("reshuffles the discard pile (except its top card) when the draw pile is empty", () => {
        const state = game({
            drawPile: [],
            discardPile: [num(70, "red", 1), num(71, "red", 2), num(80, "red", 5)],
        });
        const after = unwrap(apply(state, {type: "draw", playerId: "alice"}));
        expect(after.discardPile.map((c) => c.id)).toEqual([80]);
        expect(after.players[0]!.hand.length).toBe(4);
        expect(after.drawPile.length).toBe(1);
        expect(after.rngState).not.toBe(state.rngState);
    });

    it("gives nothing when both piles are empty, without crashing", () => {
        const state = game({drawPile: [], discardPile: [num(80, "red", 5)]});
        const after = unwrap(apply(state, {type: "draw", playerId: "alice"}));
        expect(handIds(after, 0)).toEqual([1, 2, 3]);
    });

    it("draws the whole penalty stack and ends the turn", () => {
        const state = game({
            pendingDraw: 2,
            discardPile: [drawTwo(80, "red")],
            drawPile: [num(90, "blue", 1), num(91, "blue", 2), num(92, "blue", 3)],
        });
        const after = unwrap(apply(state, {type: "draw", playerId: "alice"}));
        expect(handIds(after, 0)).toEqual([1, 2, 3, 92, 91]);
        expect(after.pendingDraw).toBe(0);
        expect(after.currentPlayerIndex).toBe(1);
    });
});

describe("pass", () => {
    it("is only allowed after drawing", () => {
        expect(apply(game(), {type: "pass", playerId: "alice"})).toEqual({ok: false, error: "mustDrawFirst"});
    });

    it("ends the turn after drawing", () => {
        const drawn = unwrap(apply(game(), {type: "draw", playerId: "alice"}));
        const after = unwrap(apply(drawn, {type: "pass", playerId: "alice"}));
        expect(after.currentPlayerIndex).toBe(1);
        expect(after.hasDrawn).toBe(false);
    });

    it("rejects a pass out of turn", () => {
        expect(apply(game(), {type: "pass", playerId: "bob"})).toEqual({ok: false, error: "notYourTurn"});
    });
});
