import type {GameEvent} from "./events";
import type {GameState} from "./state";

export type ActionError =
    | "wrongPhase"
    | "invalidHandSize"
    | "alreadyJoined"
    | "roomFull"
    | "notHost"
    | "notEnoughPlayers"
    | "alreadyStarting"
    | "notYourTurn"
    | "cardNotInHand"
    | "cardNotPlayable"
    | "colorRequired"
    | "alreadyDrawn"
    | "mustDrawFirst"
    | "notInGame";

export type Result<S = GameState> =
    | {ok: true; state: S; events: GameEvent[]}
    | {ok: false; error: ActionError};

export function ok<S>(state: S, events: GameEvent[] = []): Result<S> {
    return {ok: true, state, events};
}

export function fail(error: ActionError): {ok: false; error: ActionError} {
    return {ok: false, error};
}
