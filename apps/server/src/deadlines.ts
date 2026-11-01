import {UNO_WINDOW_MS, type GameState, type PlayerId} from "@uno/engine";

export const RECONNECT_GRACE_MS = 30_000;
export const FINISHED_ROOM_TTL_MS = 10 * 60_000;

export type RoomTimers = {
    disconnectedAt: Record<PlayerId, number>;
    closesAt: number | null;
};

export const NO_TIMERS: RoomTimers = {disconnectedAt: {}, closesAt: null};

export function nextDeadline(state: GameState, timers: RoomTimers): number | null {
    const deadlines = [
        ...gameDeadlines(state),
        ...Object.values(timers.disconnectedAt).map((at) => at + RECONNECT_GRACE_MS),
        ...(timers.closesAt === null ? [] : [timers.closesAt]),
    ];
    return deadlines.length > 0 ? Math.min(...deadlines) : null;
}

export function expiredDisconnects(timers: RoomTimers, now: number): PlayerId[] {
    return Object.entries(timers.disconnectedAt)
        .filter(([, at]) => at + RECONNECT_GRACE_MS <= now)
        .map(([playerId]) => playerId);
}

export function closingTime(state: GameState, now: number, current: number | null): number | null {
    if (state.phase === "finished") {
        return current ?? now + FINISHED_ROOM_TTL_MS;
    }
    if (state.phase === "lobby" && state.players.length === 0) {
        return current ?? now;
    }
    return null;
}

function gameDeadlines(state: GameState): number[] {
    switch (state.phase) {
        case "lobby":
            return state.startsAt === null ? [] : [state.startsAt];
        case "playing":
            return state.unoWindows.map((w) => w.openedAt + UNO_WINDOW_MS);
        case "finished":
            return [];
    }
}
