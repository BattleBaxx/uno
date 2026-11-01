import type {GameState} from "./state";

export type ActionError =
    | "wrongPhase"
    | "notImplemented"
    | "invalidHandSize"
    | "alreadyJoined"
    | "roomFull"
    | "notHost"
    | "notEnoughPlayers";

export type Result<S = GameState> =
    | {ok: true; state: S}
    | {ok: false; error: ActionError};

export function ok<S>(state: S): Result<S> {
    return {ok: true, state};
}

export function fail(error: ActionError): {ok: false; error: ActionError} {
    return {ok: false, error};
}
