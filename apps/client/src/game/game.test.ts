import {describe, it, expect} from "vitest";
import {createDeck, type Card} from "@uno/engine";
import type {PlayerView} from "@uno/protocol";
import {describeEvent, errorText, type LogLine} from "./log";
import {CHAT_LIMIT, INITIAL_STATE, reduce, type ClientState} from "./store";

const deck = createDeck();
const card = (predicate: (c: Card) => boolean) => deck.find(predicate)!;
const text = (line: LogLine) => line.map((part) => part.text).join("");
const names = {a: "alice", b: "bob"};

describe("describeEvent", () => {
    it("names players, and calls you 'you'", () => {
        expect(text(describeEvent({type: "joined", playerId: "a"}, names, "b"))).toBe("alice joined");
        expect(text(describeEvent({type: "joined", playerId: "b"}, names, "b"))).toBe("you joined");
        expect(text(describeEvent({type: "joined", playerId: "zz"}, names, "b"))).toBe("someone joined");
    });

    it("describes played cards with their colors", () => {
        const redSeven = card((c) => c.kind === "number" && c.color === "red" && c.value === 7);
        const line = describeEvent({type: "played", playerId: "a", card: redSeven, color: "red"}, names, null);
        expect(text(line)).toBe("alice played red 7");
        expect(line.at(-1)?.color).toBe("red");
    });

    it("says which color a wild was turned into", () => {
        const wild = card((c) => c.kind === "wildDrawFour");
        expect(text(describeEvent({type: "played", playerId: "a", card: wild, color: "blue"}, names, null))).toBe(
            "alice played wild +4 → blue",
        );
    });

    it("explains why someone drew cards", () => {
        const drew = (count: number, reason: "choice" | "stack" | "unoPenalty" | "falseCall") =>
            text(describeEvent({type: "drew", playerId: "a", count, reason}, names, null));
        expect(drew(1, "choice")).toBe("alice drew 1 card");
        expect(drew(4, "stack")).toBe("alice drew 4 cards from the stack");
        expect(drew(4, "unoPenalty")).toBe("alice drew 4 cards as a penalty");
        expect(drew(4, "falseCall")).toBe("alice called UNO for nothing and drew 4 cards");
        expect(drew(0, "choice")).toBe("alice could not draw: no cards are left");
    });

    it("describes the UNO moments", () => {
        expect(text(describeEvent({type: "caught", playerId: "a", by: "b"}, names, null))).toBe(
            "bob caught alice without UNO!",
        );
        expect(text(describeEvent({type: "calledUno", playerId: "a"}, names, null))).toBe("alice called UNO!");
        expect(text(describeEvent({type: "won", playerId: "b"}, names, "b"))).toBe("you won the game!");
    });
});

describe("errorText", () => {
    it("turns error codes into sentences", () => {
        expect(errorText("roomFull")).toBe("That room is full.");
        expect(errorText("notYourTurn")).toBe("It's not your turn.");
        expect(errorText("somethingNew")).toBe("Something went wrong.");
    });
});

describe("reduce", () => {
    const lobbyView: PlayerView = {
        phase: "lobby",
        you: "a",
        names,
        players: ["a", "b"],
        host: "a",
        settings: {handSize: 7},
        startsAt: null,
    };
    const message = (state: ClientState, m: Parameters<typeof reduce>[1] & {type: "message"}) => reduce(state, m);

    it("remembers who we are from the welcome", () => {
        const state = reduce(INITIAL_STATE, {
            type: "message",
            message: {type: "welcome", roomKey: "ABCDEF", playerId: "a", token: "t1"},
            now: 0,
        });
        expect([state.roomKey, state.you, state.token]).toEqual(["ABCDEF", "a", "t1"]);
    });

    it("keeps the latest view and every name it has seen", () => {
        let state = message(INITIAL_STATE, {type: "message", message: {type: "view", view: lobbyView}, now: 0});
        state = message(state, {type: "message", message: {type: "view", view: {...lobbyView, names: {a: "alice"}}}, now: 0});
        expect(state.view?.names).toEqual({a: "alice"});
        expect(state.names).toEqual(names);
    });

    it("adds events to the log and chat to the chat", () => {
        let state = message(INITIAL_STATE, {
            type: "message",
            message: {type: "events", events: [{type: "joined", playerId: "b"}]},
            now: 0,
        });
        state = message(state, {type: "message", message: {type: "chat", from: "b", text: "hi"}, now: 0});
        expect(state.log).toEqual([{kind: "event", event: {type: "joined", playerId: "b"}}]);
        expect(state.chat).toEqual([{from: "b", text: "hi"}]);
    });

    it("clears the chat on a new welcome, because the server sends the history again", () => {
        let state = message(INITIAL_STATE, {type: "message", message: {type: "chat", from: "b", text: "hi"}, now: 0});
        state = message(state, {
            type: "message",
            message: {type: "welcome", roomKey: "ABCDEF", playerId: "a", token: "t1"},
            now: 0,
        });
        expect(state.chat).toEqual([]);
    });

    it("keeps only the most recent chat lines", () => {
        let state = INITIAL_STATE;
        for (let i = 0; i < CHAT_LIMIT + 5; i++) {
            state = message(state, {type: "message", message: {type: "chat", from: "b", text: `m${i}`}, now: 0});
        }
        expect(state.chat.length).toBe(CHAT_LIMIT);
        expect(state.chat[0]?.text).toBe("m5");
    });

    it("tracks who is offline", () => {
        let state = message(INITIAL_STATE, {
            type: "message",
            message: {type: "presence", playerId: "b", connected: false},
            now: 0,
        });
        expect(state.offline).toEqual(["b"]);
        state = message(state, {type: "message", message: {type: "presence", playerId: "b", connected: true}, now: 0});
        expect(state.offline).toEqual([]);
    });

    it("shows errors as a timed notice, and keeps them in the log", () => {
        const state = message(INITIAL_STATE, {type: "message", message: {type: "error", error: "notYourTurn"}, now: 42});
        expect(state.notice).toEqual({text: "It's not your turn.", at: 42});
        expect(state.log).toEqual([{kind: "refused", text: "It's not your turn."}]);
    });

    it("starts a card slide from the old top card when someone plays", () => {
        const [oldTop, played] = createDeck();
        const playing: PlayerView = {
            phase: "playing",
            you: "a",
            names,
            hand: [],
            players: [],
            currentPlayer: "b",
            direction: 1,
            topCard: oldTop!,
            currentColor: "red",
            pendingDraw: 0,
            hasDrawn: false,
            drawPileCount: 50,
        };
        let state = message(INITIAL_STATE, {type: "message", message: {type: "view", view: playing}, now: 0});
        state = message(state, {
            type: "message",
            message: {type: "events", events: [{type: "played", playerId: "b", card: played!, color: "red"}]},
            now: 500,
        });
        expect(state.slide).toEqual({card: played, playerId: "b", under: oldTop, startedAt: 500});
    });

    it("does not start a slide outside a running game", () => {
        const [card] = createDeck();
        const state = message(INITIAL_STATE, {
            type: "message",
            message: {type: "events", events: [{type: "played", playerId: "b", card: card!, color: "red"}]},
            now: 0,
        });
        expect(state.slide).toBeNull();
    });

    it("ignores refused actions once the game is over", () => {
        const finished = message(INITIAL_STATE, {
            type: "message",
            message: {type: "view", view: {phase: "finished", you: "a", names, winner: "b"}},
            now: 0,
        });
        const state = message(finished, {type: "message", message: {type: "error", error: "wrongPhase"}, now: 5});
        expect(state.notice).toBeNull();
        expect(state.log).toEqual([]);
    });

    it("tracks the connection status and why it closed", () => {
        expect(reduce(INITIAL_STATE, {type: "status", status: "closed", reason: "roomFull"})).toMatchObject({
            status: "closed",
            reason: "roomFull",
        });
    });
});
