import type {Action, PlayerId} from "@uno/engine";
import type {ClientMessage} from "@uno/protocol";

export function toAction(message: ClientMessage, playerId: PlayerId, now: number): Action {
    switch (message.type) {
        case "start":
            return {type: "start", playerId, now};
        case "play":
            return {type: "play", playerId, cardId: message.cardId, color: message.color, now};
        case "draw":
            return {type: "draw", playerId};
        case "pass":
            return {type: "pass", playerId};
        case "callUno":
        case "chat":
            return {type: "callUno", playerId, now};
    }
}
