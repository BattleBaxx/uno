import {describe, it, expect} from "vitest";
import {UNO_WINDOW_MS, type LobbyState, type PlayingState} from "@uno/engine";
import {
    closingTime,
    expiredDisconnects,
    FINISHED_ROOM_TTL_MS,
    nextDeadline,
    NO_TIMERS,
    RECONNECT_GRACE_MS,
} from "./deadlines";

const lobby = (overrides: Partial<LobbyState> = {}): LobbyState => ({
    phase: "lobby",
    players: ["a", "b"],
    host: "a",
    settings: {handSize: 7},
    startsAt: null,
    ...overrides,
});

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
        expect(nextDeadline(lobby({startsAt: 3000}), NO_TIMERS)).toBe(3000);
    });

    it("is nothing in an idle lobby or a finished game without timers", () => {
        expect(nextDeadline(lobby(), NO_TIMERS)).toBeNull();
        expect(nextDeadline({phase: "finished", winner: "a"}, NO_TIMERS)).toBeNull();
    });

    it("is the earliest UNO window to time out", () => {
        const state = playing([
            {playerId: "a", openedAt: 5000},
            {playerId: "b", openedAt: 2000},
        ]);
        expect(nextDeadline(state, NO_TIMERS)).toBe(2000 + UNO_WINDOW_MS);
    });

    it("includes the reconnect grace of disconnected players", () => {
        const timers = {disconnectedAt: {a: 1000}, closesAt: null};
        expect(nextDeadline(lobby({startsAt: 99_999}), timers)).toBe(1000 + RECONNECT_GRACE_MS);
    });

    it("includes the time the room closes", () => {
        expect(nextDeadline({phase: "finished", winner: "a"}, {disconnectedAt: {}, closesAt: 7000})).toBe(7000);
    });
});

describe("expiredDisconnects", () => {
    it("lists only players whose 30 seconds are up", () => {
        const timers = {disconnectedAt: {a: 0, b: 10_000}, closesAt: null};
        expect(expiredDisconnects(timers, RECONNECT_GRACE_MS)).toEqual(["a"]);
        expect(expiredDisconnects(timers, RECONNECT_GRACE_MS - 1)).toEqual([]);
    });
});

describe("closingTime", () => {
    it("keeps a finished game for 10 minutes", () => {
        expect(closingTime({phase: "finished", winner: "a"}, 1000, null)).toBe(1000 + FINISHED_ROOM_TTL_MS);
    });

    it("does not push back a closing time that is already set", () => {
        expect(closingTime({phase: "finished", winner: "a"}, 9000, 5000)).toBe(5000);
    });

    it("closes an empty lobby right away", () => {
        expect(closingTime(lobby({players: []}), 1000, null)).toBe(1000);
    });

    it("keeps rooms that are still in use open", () => {
        expect(closingTime(lobby(), 1000, null)).toBeNull();
        expect(closingTime(playing([]), 1000, null)).toBeNull();
    });
});
