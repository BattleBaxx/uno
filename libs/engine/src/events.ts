import type {Card, Color} from "./cards/card";
import type {PlayerId, PlayingState} from "./state";

export type DrawReason = "choice" | "stack" | "unoPenalty" | "falseCall";

export type GameEvent =
    | {type: "joined"; playerId: PlayerId}
    | {type: "removed"; playerId: PlayerId}
    | {type: "hostChanged"; playerId: PlayerId}
    | {type: "started"}
    | {type: "played"; playerId: PlayerId; card: Card; color: Color}
    | {type: "drew"; playerId: PlayerId; count: number; reason: DrawReason}
    | {type: "passed"; playerId: PlayerId}
    | {type: "calledUno"; playerId: PlayerId}
    | {type: "caught"; playerId: PlayerId; by: PlayerId}
    | {type: "unoTimedOut"; playerId: PlayerId}
    | {type: "missedUno"; playerId: PlayerId}
    | {type: "won"; playerId: PlayerId};

export function drewEvent(before: PlayingState, after: PlayingState, playerId: PlayerId, reason: DrawReason): GameEvent {
    return {type: "drew", playerId, count: handSize(after, playerId) - handSize(before, playerId), reason};
}

function handSize(state: PlayingState, playerId: PlayerId): number {
    return state.players.find((p) => p.id === playerId)?.hand.length ?? 0;
}
