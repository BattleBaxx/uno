import type {CallUnoAction, UnoTimeoutAction} from "../action";
import type {PlayerId, PlayingState, UnoWindow} from "../state";
import {giveCards} from "../cards/piles";
import {drewEvent, type GameEvent} from "../events";
import {fail, ok, type Result} from "../result";

export const UNO_HEAD_START_MS = 3_000;
export const UNO_WINDOW_MS = 30_000;
export const UNO_PENALTY = 4;

export function callUno(state: PlayingState, action: CallUnoAction): Result {
    const caller = action.playerId;
    if (!state.players.some((p) => p.id === caller)) {
        return fail("notInGame");
    }

    if (hasOpenWindow(state, caller)) {
        const unoWindows = state.unoWindows.filter((w) => w.playerId !== caller);
        return ok({...state, unoWindows}, [{type: "calledUno", playerId: caller}]);
    }

    const caught = state.unoWindows
        .filter((w) => action.now - w.openedAt >= UNO_HEAD_START_MS)
        .map((w) => w.playerId);
    if (caught.length > 0) {
        const after = penalize(state, caught, UNO_PENALTY);
        const events = caught.flatMap((id): GameEvent[] => [
            {type: "caught", playerId: id, by: caller},
            drewEvent(state, after, id, "unoPenalty"),
        ]);
        return ok(after, events);
    }

    if (state.unoWindows.length > 0) {
        return ok(state);
    }

    const after = penalize(state, [caller], UNO_PENALTY);
    return ok(after, [drewEvent(state, after, caller, "falseCall")]);
}

export function unoTimeout(state: PlayingState, action: UnoTimeoutAction): Result {
    const window = state.unoWindows.find((w) => w.playerId === action.playerId);
    if (!window || action.now - window.openedAt < UNO_WINDOW_MS) {
        return ok(state);
    }

    const after = penalize(state, [action.playerId], UNO_PENALTY);
    return ok(after, [
        {type: "unoTimedOut", playerId: action.playerId},
        drewEvent(state, after, action.playerId, "unoPenalty"),
    ]);
}

export function penalize(state: PlayingState, playerIds: PlayerId[], count: number): PlayingState {
    let after = state;
    for (const id of playerIds) {
        after = giveCards(after, id, count);
    }
    return {...after, unoWindows: after.unoWindows.filter((w) => !playerIds.includes(w.playerId))};
}

export function hasOpenWindow(state: PlayingState, playerId: PlayerId): boolean {
    return state.unoWindows.some((w) => w.playerId === playerId);
}

export function openWindow(state: PlayingState, playerId: PlayerId, now: number): UnoWindow[] {
    return [...state.unoWindows.filter((w) => w.playerId !== playerId), {playerId, openedAt: now}];
}
