import type {Card, Color, GameState, PlayerId, PlayingState, Settings} from "@uno/engine";

export const VISIBLE_CARD_COUNT_MAX = 3;

export type Names = Record<PlayerId, string>;

export type LobbyView = {
    phase: "lobby";
    you: PlayerId;
    names: Names;
    players: PlayerId[];
    host: PlayerId;
    settings: Settings;
    startsAt: number | null;
};

export type OtherPlayer = {
    id: PlayerId;
    cardCount: number | null;
};

export type PlayingView = {
    phase: "playing";
    you: PlayerId;
    names: Names;
    hand: Card[];
    players: OtherPlayer[];
    currentPlayer: PlayerId;
    direction: PlayingState["direction"];
    topCard: Card;
    currentColor: Color;
    pendingDraw: number;
    hasDrawn: boolean;
    drawPileCount: number;
};

export type FinishedView = {
    phase: "finished";
    you: PlayerId;
    names: Names;
    winner: PlayerId;
};

export type PlayerView = LobbyView | PlayingView | FinishedView;

export function viewFor(state: GameState, playerId: PlayerId, names: Names): PlayerView {
    switch (state.phase) {
        case "lobby":
            return {
                phase: "lobby",
                you: playerId,
                names,
                players: state.players,
                host: state.host,
                settings: state.settings,
                startsAt: state.startsAt,
            };
        case "playing":
            return {
                phase: "playing",
                you: playerId,
                names,
                hand: state.players.find((p) => p.id === playerId)?.hand ?? [],
                players: state.players.map((p) => ({
                    id: p.id,
                    cardCount: p.id === playerId || p.hand.length <= VISIBLE_CARD_COUNT_MAX ? p.hand.length : null,
                })),
                currentPlayer: state.players[state.currentPlayerIndex]!.id,
                direction: state.direction,
                topCard: state.discardPile.at(-1)!,
                currentColor: state.currentColor,
                pendingDraw: state.pendingDraw,
                hasDrawn: state.hasDrawn,
                drawPileCount: state.drawPile.length,
            };
        case "finished":
            return {phase: "finished", you: playerId, names, winner: state.winner};
    }
}
