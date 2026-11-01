import type {Card} from "./cards/card";
import type {DrawAction, PassAction, PlayAction} from "./action";
import type {Player, PlayingState} from "./state";
import {shuffle} from "./cards/deck";
import {fail, ok, type Result} from "./result";

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
        return ok({phase: "finished", winner: player.id});
    }

    const after: PlayingState = {
        ...state,
        players: withCurrentHand(state, hand),
        discardPile: [...state.discardPile, card],
        currentColor: color,
    };

    switch (card.kind) {
        case "number":
        case "wild":
            return ok(endTurn(after));
        case "skip":
            return ok(endTurn(after, 2));
        case "reverse":
            if (state.players.length === 2) {
                return ok(endTurn(after, 2));
            }
            return ok(endTurn({...after, direction: after.direction === 1 ? -1 : 1}));
        case "drawTwo":
            return ok(endTurn({...after, pendingDraw: state.pendingDraw + 2}));
        case "wildDrawFour":
            return ok(endTurn({...after, pendingDraw: state.pendingDraw + 4}));
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
        const {cards, state: after} = takeCards(state, state.pendingDraw);
        const hand = [...player.hand, ...cards];
        return ok(endTurn({...after, pendingDraw: 0, players: withCurrentHand(after, hand)}));
    }

    const {cards, state: after} = takeCards(state, 1);
    const hand = [...player.hand, ...cards];
    const drawn: PlayingState = {...after, hasDrawn: true, players: withCurrentHand(after, hand)};

    const canPlay = hand.some((c) => isPlayable(c, drawn));
    return ok(canPlay ? drawn : endTurn(drawn));
}

export function pass(state: PlayingState, action: PassAction): Result {
    if (currentPlayer(state).id !== action.playerId) {
        return fail("notYourTurn");
    }
    if (!state.hasDrawn) {
        return fail("mustDrawFirst");
    }

    return ok(endTurn(state));
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

function takeCards(state: PlayingState, count: number): {cards: Card[]; state: PlayingState} {
    let drawPile = [...state.drawPile];
    let discardPile = state.discardPile;
    let rngState = state.rngState;
    const cards: Card[] = [];

    while (cards.length < count) {
        if (drawPile.length === 0) {
            if (discardPile.length <= 1) {
                break;
            }
            const reshuffled = shuffle(discardPile.slice(0, -1), rngState);
            drawPile = reshuffled.items;
            rngState = reshuffled.rngState;
            discardPile = discardPile.slice(-1);
        }
        cards.push(drawPile.pop()!);
    }

    return {cards, state: {...state, drawPile, discardPile, rngState}};
}
