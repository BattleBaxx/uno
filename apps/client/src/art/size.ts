export type Tier = "large" | "medium" | "small";

export type CardSize = {width: number; height: number; reveal: number};

export const MIN_COLUMNS = 80;
export const MIN_ROWS = 24;
export const MIN_REVEAL = 3;

export const CARD_SIZES: Record<Tier, CardSize> = {
    large: {width: 11, height: 7, reveal: 5},
    medium: {width: 9, height: 5, reveal: 4},
    small: {width: 6, height: 4, reveal: 3},
};

export function tierFor(columns: number, rows: number): Tier | null {
    if (columns >= 140 && rows >= 40) {
        return "large";
    }
    if (columns >= 100 && rows >= 30) {
        return "medium";
    }
    if (columns >= MIN_COLUMNS && rows >= MIN_ROWS) {
        return "small";
    }
    return null;
}
