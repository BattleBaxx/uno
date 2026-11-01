import {describe, it, expect} from "vitest";
import {apply} from "./apply";
import type {Result} from "./result";
import type {GameEvent} from "./events";
import type {LobbyState} from "./state";
import {drawTwo, game, num, wild} from "./rules/fixtures";

function eventsOf(result: Result): GameEvent[] {
    if (!result.ok) {
        throw new Error(`expected ok, got error "${result.error}"`);
    }
    return result.events;
}

const lobby: LobbyState = {phase: "lobby", players: ["alice", "bob"], host: "alice", settings: {handSize: 7}, startsAt: null};

const aliceOnOneCard = () =>
    game({
        players: [
            {id: "alice", hand: [num(1, "red", 7)]},
            {id: "bob", hand: [num(11, "blue", 4), num(12, "red", 6)]},
            {id: "carol", hand: [num(21, "green", 8), num(22, "green", 1)]},
        ],
        drawPile: Array.from({length: 10}, (_, i) => num(90 + i, "blue", 1)),
        unoWindows: [{playerId: "alice", openedAt: 1000}],
    });

describe("events", () => {
    it("join", () => {
        expect(eventsOf(apply(lobby, {type: "join", playerId: "carol"}))).toEqual([{type: "joined", playerId: "carol"}]);
    });

    it("start begins the countdown", () => {
        expect(eventsOf(apply(lobby, {type: "start", playerId: "alice", now: 1000}))).toEqual([
            {type: "countdownStarted", startsAt: 4000},
        ]);
    });

    it("the countdown ending starts the game", () => {
        const counting = {...lobby, startsAt: 4000};
        expect(eventsOf(apply(counting, {type: "countdownTimeout", seed: 1, now: 4000}))).toEqual([{type: "started"}]);
    });

    it("play, with the card and the color it leaves", () => {
        expect(eventsOf(apply(game(), {type: "play", playerId: "alice", cardId: 1, now: 0}))).toEqual([
            {type: "played", playerId: "alice", card: num(1, "red", 7), color: "red"},
        ]);
    });

    it("play of a wild reports the chosen color", () => {
        const state = game({players: [{id: "alice", hand: [wild(1), num(2, "red", 1)]}, ...game().players.slice(1)]});
        expect(eventsOf(apply(state, {type: "play", playerId: "alice", cardId: 1, color: "blue", now: 0}))).toEqual([
            {type: "played", playerId: "alice", card: wild(1), color: "blue"},
        ]);
    });

    it("draw by choice", () => {
        expect(eventsOf(apply(game(), {type: "draw", playerId: "alice"}))).toEqual([
            {type: "drew", playerId: "alice", count: 1, reason: "choice"},
        ]);
    });

    it("drawing a stack", () => {
        const state = game({pendingDraw: 2, discardPile: [drawTwo(80, "red")]});
        expect(eventsOf(apply(state, {type: "draw", playerId: "alice"}))).toEqual([
            {type: "drew", playerId: "alice", count: 2, reason: "stack"},
        ]);
    });

    it("drew counts the cards actually received when the piles run dry", () => {
        const state = game({pendingDraw: 4, discardPile: [drawTwo(80, "red")], drawPile: [num(90, "blue", 1)]});
        expect(eventsOf(apply(state, {type: "draw", playerId: "alice"}))).toEqual([
            {type: "drew", playerId: "alice", count: 1, reason: "stack"},
        ]);
    });

    it("pass", () => {
        const drawn = apply(game(), {type: "draw", playerId: "alice"});
        if (!drawn.ok) {
            throw new Error(drawn.error);
        }
        expect(eventsOf(apply(drawn.state, {type: "pass", playerId: "alice"}))).toEqual([
            {type: "passed", playerId: "alice"},
        ]);
    });

    it("calling your own UNO", () => {
        expect(eventsOf(apply(aliceOnOneCard(), {type: "callUno", playerId: "alice", now: 1500}))).toEqual([
            {type: "calledUno", playerId: "alice"},
        ]);
    });

    it("catching someone", () => {
        expect(eventsOf(apply(aliceOnOneCard(), {type: "callUno", playerId: "bob", now: 5000}))).toEqual([
            {type: "caught", playerId: "alice", by: "bob"},
            {type: "drew", playerId: "alice", count: 4, reason: "unoPenalty"},
        ]);
    });

    it("a call during the head start produces nothing", () => {
        expect(eventsOf(apply(aliceOnOneCard(), {type: "callUno", playerId: "bob", now: 2000}))).toEqual([]);
    });

    it("a false call", () => {
        const state = aliceOnOneCard();
        expect(eventsOf(apply({...state, unoWindows: []}, {type: "callUno", playerId: "carol", now: 5000}))).toEqual([
            {type: "drew", playerId: "carol", count: 4, reason: "falseCall"},
        ]);
    });

    it("the UNO window timing out", () => {
        expect(eventsOf(apply(aliceOnOneCard(), {type: "unoTimeout", playerId: "alice", now: 31_000}))).toEqual([
            {type: "unoTimedOut", playerId: "alice"},
            {type: "drew", playerId: "alice", count: 4, reason: "unoPenalty"},
        ]);
    });

    it("trying to play the last card without calling UNO", () => {
        expect(eventsOf(apply(aliceOnOneCard(), {type: "play", playerId: "alice", cardId: 1, now: 2000}))).toEqual([
            {type: "missedUno", playerId: "alice"},
            {type: "drew", playerId: "alice", count: 4, reason: "unoPenalty"},
        ]);
    });

    it("a player being removed mid-game", () => {
        expect(eventsOf(apply(game(), {type: "removePlayer", playerId: "carol"}))).toEqual([
            {type: "removed", playerId: "carol"},
        ]);
    });

    it("never reveals which cards were drawn", () => {
        const results = [
            apply(game(), {type: "draw", playerId: "alice"}),
            apply(aliceOnOneCard(), {type: "callUno", playerId: "bob", now: 5000}),
            apply(aliceOnOneCard(), {type: "unoTimeout", playerId: "alice", now: 31_000}),
        ];
        for (const event of results.flatMap(eventsOf)) {
            if (event.type === "drew") {
                expect(Object.keys(event).sort()).toEqual(["count", "playerId", "reason", "type"]);
            }
        }
    });
});
