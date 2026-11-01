import type {GameState} from "./state";
import type {Action} from "./action";
import {join, start} from "./lobby";
import {fail, type Result} from "./result";

export function apply(state: GameState, action: Action): Result {
    switch (action.type) {
        case "join":
            return state.phase === "lobby" ? join(state, action) : fail("wrongPhase");
        case "start":
            return state.phase === "lobby" ? start(state, action) : fail("wrongPhase");

        // TODO: implemented in the next pieces.
        case "play":
        case "draw":
        case "pass":
        case "callUno":
        case "unoTimeout":
        case "removePlayer":
            return fail("notImplemented");
    }
}
