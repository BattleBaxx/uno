import type {PlayerId} from "./state";
import type {CardId, Color} from "./card";

type JoinAction = {
    type: "join";
    playerId: PlayerId;
}

type StartAction = {
    type: "start";
    playerId: PlayerId;
    seed: number;
}

type PlayAction = {
    type: "play";
    playerId: PlayerId;
    cardId: CardId;
    color?: Color;
    now: number;
}

type DrawAction = {
    type: "draw";
    playerId: PlayerId;
};

type PassAction = {
    type: "pass";
    playerId: PlayerId;
};

type CallUnoAction = {
    type: "callUno";
    playerId: PlayerId;
    now: number;
}

type PlayerAction = JoinAction | StartAction | PlayAction | DrawAction | PassAction | CallUnoAction;

type UnoTimeoutAction = {
    type: "unoTimeout";
    playerId: PlayerId;
    now: number;
}

type RemovePlayerAction = {
    type: "removePlayer";
    playerId: PlayerId;
}

type ServerAction = UnoTimeoutAction | RemovePlayerAction;

export type Action = PlayerAction | ServerAction;