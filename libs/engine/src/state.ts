import type {Card, Color} from "./cards/card";

type Hand = Card[]

export type PlayerId = string;

export type Player = {
    id: PlayerId;
    hand: Hand;
};

type Direction = -1 | 1


type UnoWindow = {
    playerId: PlayerId;
    // When the player got down to one card, in milliseconds since the Unix epoch
    openedAt: number;
}

type Settings = {
    handSize: number;
}

type LobbyState = {
    phase: "lobby";
    players: PlayerId[];
    host: PlayerId;
    settings: Settings;
};

type PlayingState = {
    phase: "playing";

    // Seeded random generator's current value. Advances on every shuffle.
    rngState: number;

    // The last card in each array represents the top card of the pile.
    drawPile: Card[];
    discardPile: Card[];

    currentColor: Color;

    players: Player[];
    currentPlayerIndex: number;
    hasDrawn: boolean;
    direction: Direction;

    // Cards owed by the current player from a +2/+4 stack. 0 means no stack.
    pendingDraw: number;

    unoWindows: UnoWindow[];
}

type FinishedState = {
    phase: "finished";
    winner: PlayerId;
};

export type GameState = LobbyState | PlayingState | FinishedState;
