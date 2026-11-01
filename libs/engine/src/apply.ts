import type {GameState} from "./state";
import type {Action} from "./action";
import {join, start} from "./rules/lobby";
import {draw, pass, play} from "./rules/turn";
import {callUno, unoTimeout} from "./rules/uno";
import {removePlayer} from "./rules/players";
import {fail, type Result} from "./result";

export function apply(state: GameState, action: Action): Result {
    switch (action.type) {
        case "join":
            return state.phase === "lobby" ? join(state, action) : fail("wrongPhase");
        case "start":
            return state.phase === "lobby" ? start(state, action) : fail("wrongPhase");

        case "play":
            return state.phase === "playing" ? play(state, action) : fail("wrongPhase");
        case "draw":
            return state.phase === "playing" ? draw(state, action) : fail("wrongPhase");
        case "pass":
            return state.phase === "playing" ? pass(state, action) : fail("wrongPhase");

        case "callUno":
            return state.phase === "playing" ? callUno(state, action) : fail("wrongPhase");
        case "unoTimeout":
            return state.phase === "playing" ? unoTimeout(state, action) : fail("wrongPhase");

        case "removePlayer":
            return state.phase === "finished" ? fail("wrongPhase") : removePlayer(state, action);
    }
}
