import type {RemovePlayerAction} from "../action";
import type {LobbyState, PlayerId, PlayingState} from "../state";
import {shuffle} from "../cards/deck";
import type {GameEvent} from "../events";
import {fail, ok, type Result} from "../result";

export function removePlayer(state: LobbyState | PlayingState, action: RemovePlayerAction): Result {
    return state.phase === "lobby"
        ? removeFromLobby(state, action.playerId)
        : removeFromGame(state, action.playerId);
}

function removeFromLobby(state: LobbyState, playerId: PlayerId): Result {
    if (!state.players.includes(playerId)) {
        return fail("notInGame");
    }

    const players = state.players.filter((id) => id !== playerId);
    const newHost = players[0];
    const host = playerId === state.host && newHost !== undefined ? newHost : state.host;
    const events: GameEvent[] = [{type: "removed", playerId}];
    if (host !== state.host) {
        events.push({type: "hostChanged", playerId: host});
    }
    return ok({...state, players, host}, events);
}

function removeFromGame(state: PlayingState, playerId: PlayerId): Result {
    const removedIndex = state.players.findIndex((p) => p.id === playerId);
    const removed = state.players[removedIndex];
    if (!removed) {
        return fail("notInGame");
    }

    const players = state.players.filter((p) => p.id !== playerId);
    const lastPlayer = players[0];
    if (players.length === 1 && lastPlayer) {
        return ok({phase: "finished", winner: lastPlayer.id}, [
            {type: "removed", playerId},
            {type: "won", playerId: lastPlayer.id},
        ]);
    }

    const shuffled = shuffle([...state.drawPile, ...removed.hand], state.rngState);
    const wasTheirTurn = removedIndex === state.currentPlayerIndex;

    return ok({
        ...state,
        players,
        drawPile: shuffled.items,
        rngState: shuffled.rngState,
        unoWindows: state.unoWindows.filter((w) => w.playerId !== playerId),
        currentPlayerIndex: indexAfterRemoval(state, removedIndex, players.length),
        pendingDraw: wasTheirTurn ? 0 : state.pendingDraw,
        hasDrawn: wasTheirTurn ? false : state.hasDrawn,
    }, [{type: "removed", playerId}]);
}

function indexAfterRemoval(state: PlayingState, removedIndex: number, remaining: number): number {
    const current = state.currentPlayerIndex;
    if (removedIndex < current) {
        return current - 1;
    }
    if (removedIndex > current) {
        return current;
    }
    const next = state.direction === 1 ? removedIndex : removedIndex - 1;
    return ((next % remaining) + remaining) % remaining;
}
