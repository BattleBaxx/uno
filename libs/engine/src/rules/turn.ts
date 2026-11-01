import type {Card} from "../cards/card";
import type {DrawAction, PassAction, PlayAction} from "../action";
import type {Player, PlayingState} from "../state";
import {giveCards} from "../cards/piles";
import {drewEvent, type GameEvent} from "../events";
import {fail, ok, type Result} from "../result";
import {hasOpenWindow, openWindow, penalize, UNO_PENALTY} from "./uno";

export function play(state: PlayingState, action: PlayAction): Result {
    const player = currentPlayer(state);
    if (player.id !== action.playerId) {
        return fail("notYourTurn");
    }

    const card = player.hand.find((c) => c.id === action.cardId);
    if (!card) {
        return fail("cardNotInHand");
    }
    if (!isPlayable(card, state)) {
        return fail("cardNotPlayable");
    }

    const color = card.kind === "wild" || card.kind === "wildDrawFour" ? action.color : card.color;
    if (!color) {
        return fail("colorRequired");
    }

    const hand = player.hand.filter((c) => c.id !== card.id);
    if (hand.length === 0) {
        if (hasOpenWindow(state, player.id)) {
            const penalized = penalize(state, [player.id], UNO_PENALTY + state.pendingDraw);
            return ok(endTurn({...penalized, pendingDraw: 0}), [
                {type: "missedUno", playerId: player.id},
                drewEvent(state, penalized, player.id, "unoPenalty"),
            ]);
        }
        return ok({phase: "finished", winner: player.id}, [
            {type: "played", playerId: player.id, card, color},
            {type: "won", playerId: player.id},
        ]);
    }

    const after: PlayingState = {
        ...state,
        players: withCurrentHand(state, hand),
        discardPile: [...state.discardPile, card],
        currentColor: color,
        unoWindows: hand.length === 1 ? openWindow(state, player.id, action.now) : state.unoWindows,
    };
    const events: GameEvent[] = [{type: "played", playerId: player.id, card, color}];

    switch (card.kind) {
        case "number":
        case "wild":
            return ok(endTurn(after), events);
        case "skip":
            return ok(endTurn(after, 2), events);
        case "reverse":
            if (state.players.length === 2) {
                return ok(endTurn(after, 2), events);
            }
            return ok(endTurn({...after, direction: after.direction === 1 ? -1 : 1}), events);
        case "drawTwo":
            return ok(endTurn({...after, pendingDraw: state.pendingDraw + 2}), events);
        case "wildDrawFour":
            return ok(endTurn({...after, pendingDraw: state.pendingDraw + 4}), events);
    }
}

export function draw(state: PlayingState, action: DrawAction): Result {
    const player = currentPlayer(state);
    if (player.id !== action.playerId) {
        return fail("notYourTurn");
    }
    if (state.hasDrawn) {
        return fail("alreadyDrawn");
    }

    if (state.pendingDraw > 0) {
        const after = giveCards(state, player.id, state.pendingDraw);
        return ok(endTurn({...after, pendingDraw: 0}), [drewEvent(state, after, player.id, "stack")]);
    }

    const drawn: PlayingState = {...giveCards(state, player.id, 1), hasDrawn: true};
    const canPlay = currentPlayer(drawn).hand.some((c) => isPlayable(c, drawn));
    const events = [drewEvent(state, drawn, player.id, "choice")];
    return ok(canPlay ? drawn : endTurn(drawn), events);
}

export function pass(state: PlayingState, action: PassAction): Result {
    if (currentPlayer(state).id !== action.playerId) {
        return fail("notYourTurn");
    }
    if (!state.hasDrawn) {
        return fail("mustDrawFirst");
    }

    return ok(endTurn(state), [{type: "passed", playerId: action.playerId}]);
}

export function isPlayable(card: Card, state: PlayingState): boolean {
    const top = state.discardPile.at(-1)!;

    if (state.pendingDraw > 0) {
        return card.kind === top.kind;
    }
    if (card.kind === "wild" || card.kind === "wildDrawFour") {
        return true;
    }
    if (card.color === state.currentColor) {
        return true;
    }
    if (card.kind === "number") {
        return top.kind === "number" && top.value === card.value;
    }
    return card.kind === top.kind;
}

export function nextPlayerIndex(state: PlayingState, steps = 1): number {
    const count = state.players.length;
    return (((state.currentPlayerIndex + state.direction * steps) % count) + count) % count;
}

function currentPlayer(state: PlayingState): Player {
    return state.players[state.currentPlayerIndex]!;
}

function withCurrentHand(state: PlayingState, hand: Card[]): Player[] {
    return state.players.map((p, i) => (i === state.currentPlayerIndex ? {...p, hand} : p));
}

function endTurn(state: PlayingState, steps = 1): PlayingState {
    return {...state, currentPlayerIndex: nextPlayerIndex(state, steps), hasDrawn: false};
}
