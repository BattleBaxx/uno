import type {Card, Color, GameState, PlayerId, PlayingState, Settings, UnoWindow} from "@uno/engine";

export type LobbyView = {
    phase: "lobby";
    you: PlayerId;
    players: PlayerId[];
    host: PlayerId;
    settings: Settings;
};

export type OtherPlayer = {
    id: PlayerId;
    cardCount: number;
};

export type PlayingView = {
    phase: "playing";
    you: PlayerId;
    hand: Card[];
    players: OtherPlayer[];
    currentPlayer: PlayerId;
    direction: PlayingState["direction"];
    topCard: Card;
    currentColor: Color;
    pendingDraw: number;
    hasDrawn: boolean;
    drawPileCount: number;
    unoWindows: UnoWindow[];
};

export type FinishedView = {
    phase: "finished";
    you: PlayerId;
    winner: PlayerId;
};

export type PlayerView = LobbyView | PlayingView | FinishedView;

export function viewFor(state: GameState, playerId: PlayerId): PlayerView {
    switch (state.phase) {
        case "lobby":
            return {
                phase: "lobby",
                you: playerId,
                players: state.players,
                host: state.host,
                settings: state.settings,
            };
        case "playing":
            return {
                phase: "playing",
                you: playerId,
                hand: state.players.find((p) => p.id === playerId)?.hand ?? [],
                players: state.players.map((p) => ({id: p.id, cardCount: p.hand.length})),
                currentPlayer: state.players[state.currentPlayerIndex]!.id,
                direction: state.direction,
                topCard: state.discardPile.at(-1)!,
                currentColor: state.currentColor,
                pendingDraw: state.pendingDraw,
                hasDrawn: state.hasDrawn,
                drawPileCount: state.drawPile.length,
                unoWindows: state.unoWindows,
            };
        case "finished":
            return {phase: "finished", you: playerId, winner: state.winner};
    }
}
