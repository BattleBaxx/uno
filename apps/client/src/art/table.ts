import type {PlayerId} from "@uno/engine";
import {blank, draw, write, type Canvas} from "./canvas";
import {cardBack} from "./card";
import type {CardSize} from "./size";

export type Seat = "left" | "top" | "right";

export const STACK_OFFSET = 2;
export const MANY_CARDS = 5;

export function seatsFor(players: PlayerId[], you: PlayerId): Partial<Record<Seat, PlayerId>> {
    const index = Math.max(0, players.indexOf(you));
    const others = [...players.slice(index + 1), ...players.slice(0, index)];

    switch (others.length) {
        case 0:
            return {};
        case 1:
            return {top: others[0]};
        case 2:
            return {left: others[0], right: others[1]};
        default:
            return {left: others[0], top: others[1], right: others[2]};
    }
}

export function backStack(count: number | null, size: CardSize): Canvas {
    const shown = count === null ? MANY_CARDS : count;
    if (shown === 0) {
        return blank(size.width, size.height);
    }
    const canvas = blank((shown - 1) * STACK_OFFSET + size.width, size.height);
    for (let i = 0; i < shown; i++) {
        draw(canvas, cardBack(size, i === shown - 1), i * STACK_OFFSET, 0);
    }
    return canvas;
}

export function stackWidth(size: CardSize): number {
    return (MANY_CARDS - 1) * STACK_OFFSET + size.width;
}

export function drawPile(count: number, size: CardSize): Canvas {
    const layers = Math.min(3, Math.max(1, Math.ceil(count / 30)));
    const canvas = blank(size.width + layers - 1, size.height + layers - 1);
    for (let i = 0; i < layers; i++) {
        draw(canvas, cardBack(size, i === layers - 1), layers - 1 - i, i);
    }
    if (count === 0) {
        write(canvas, 1, 1, "empty", {color: "gray"});
    }
    return canvas;
}
