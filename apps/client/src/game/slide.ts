import type {Card, PlayerId} from "@uno/engine";

export const SLIDE_MS = 350;

export type Slide = {card: Card; playerId: PlayerId; under: Card; startedAt: number};

export type Point = {x: number; y: number};

export function slideProgress(slide: Slide, now: number): number {
    const t = Math.min(1, Math.max(0, (now - slide.startedAt) / SLIDE_MS));
    return 1 - (1 - t) ** 3;
}

export function slidePosition(from: Point, to: Point, progress: number): Point {
    return {
        x: Math.round(from.x + (to.x - from.x) * progress),
        y: Math.round(from.y + (to.y - from.y) * progress),
    };
}

export function isSliding(slide: Slide | null, now: number): slide is Slide {
    return slide !== null && now - slide.startedAt < SLIDE_MS;
}
