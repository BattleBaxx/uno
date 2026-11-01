import type {PlayerId} from "./state";
import type {CardId, Color} from "./cards/card";

export type JoinAction = {
    type: "join";
    playerId: PlayerId;
}

export type StartAction = {
    type: "start";
    playerId: PlayerId;
    now: number;
}

export type PlayAction = {
    type: "play";
    playerId: PlayerId;
    cardId: CardId;
    color?: Color;
    now: number;
}

export type DrawAction = {
    type: "draw";
    playerId: PlayerId;
};

export type PassAction = {
    type: "pass";
    playerId: PlayerId;
};

export type CallUnoAction = {
    type: "callUno";
    playerId: PlayerId;
    now: number;
}

type PlayerAction = JoinAction | StartAction | PlayAction | DrawAction | PassAction | CallUnoAction;

export type UnoTimeoutAction = {
    type: "unoTimeout";
    playerId: PlayerId;
    now: number;
}

export type RemovePlayerAction = {
    type: "removePlayer";
    playerId: PlayerId;
}

export type CountdownTimeoutAction = {
    type: "countdownTimeout";
    seed: number;
    now: number;
}

type ServerAction = UnoTimeoutAction | RemovePlayerAction | CountdownTimeoutAction;

export type Action = PlayerAction | ServerAction;