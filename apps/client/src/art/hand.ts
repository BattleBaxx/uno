import type {Card} from "@uno/engine";
import {blank, draw, write, type Canvas} from "./canvas";
import {cardFace, cardPaint, colorLetter} from "./card";
import {MIN_REVEAL, type CardSize} from "./size";

export type HandLayout = {
    canvas: Canvas;
    hiddenLeft: number;
    hiddenRight: number;
};

export function layoutHand(cards: Card[], selected: number, size: CardSize, maxWidth: number): HandLayout {
    if (cards.length === 0) {
        return {canvas: blank(0, size.height + 1), hiddenLeft: 0, hiddenRight: 0};
    }

    const chosen = Math.min(Math.max(selected, 0), cards.length - 1);
    const reveal = fittingReveal(cards.length, size, maxWidth);
    const count = Math.min(cards.length, visibleCount(size, reveal, maxWidth));
    const first = Math.min(Math.max(chosen - Math.floor((count - 1) / 2), 0), cards.length - count);
    const visible = cards.slice(first, first + count);
    const lifted = chosen - first;

    const spread = size.width - reveal;
    const positions = visible.map((_, i) => i * reveal + (i > lifted ? spread : 0));
    const width = (positions.at(-1) ?? 0) + size.width;
    const canvas = blank(width, size.height + 1);

    visible.forEach((card, i) => {
        if (i === lifted) {
            return;
        }
        const x = positions[i] ?? 0;
        draw(canvas, cardFace(card, size), x, 1);
        const letter = colorLetter(card);
        const overlapped = i < visible.length - 1;
        if (letter && overlapped) {
            write(canvas, x + 1, 1, letter, {color: cardPaint(card), bold: true});
        }
    });
    const liftedCard = visible[lifted];
    if (liftedCard) {
        draw(canvas, cardFace(liftedCard, size), positions[lifted] ?? 0, 0);
    }

    return {canvas, hiddenLeft: first, hiddenRight: cards.length - first - count};
}

function fittingReveal(count: number, size: CardSize, maxWidth: number): number {
    for (let reveal = size.reveal; reveal > MIN_REVEAL; reveal--) {
        if (handWidth(count, size, reveal) <= maxWidth) {
            return reveal;
        }
    }
    return MIN_REVEAL;
}

function visibleCount(size: CardSize, reveal: number, maxWidth: number): number {
    let count = 1;
    while (handWidth(count + 1, size, reveal) <= maxWidth) {
        count++;
    }
    return count;
}

function handWidth(count: number, size: CardSize, reveal: number): number {
    return count <= 1 ? size.width : (count - 1) * reveal + size.width + (size.width - reveal);
}
