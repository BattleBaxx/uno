import type {Card} from "./card";
import type {PlayerId, PlayingState} from "../state";
import {shuffle} from "./deck";

export function giveCards(state: PlayingState, playerId: PlayerId, count: number): PlayingState {
    const {cards, state: after} = takeCards(state, count);
    const players = after.players.map((p) => (p.id === playerId ? {...p, hand: [...p.hand, ...cards]} : p));
    const stillOnOneCard = players.some((p) => p.id === playerId && p.hand.length === 1);
    const unoWindows = stillOnOneCard ? after.unoWindows : after.unoWindows.filter((w) => w.playerId !== playerId);
    return {...after, players, unoWindows};
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
