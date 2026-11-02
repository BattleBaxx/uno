import {describe, it, expect} from "vitest";
import {canvasWidth, toLines} from "./canvas";
import {CARD_SIZES} from "./size";
import {backStack, drawPile, seatsFor, STACK_OFFSET} from "./table";

describe("seatsFor", () => {
    it("puts a single opponent across the table", () => {
        expect(seatsFor(["a", "b"], "a")).toEqual({top: "b"});
    });

    it("puts two opponents left and right, in turn order", () => {
        expect(seatsFor(["a", "b", "c"], "a")).toEqual({left: "b", right: "c"});
    });

    it("seats three opponents clockwise: left, top, right", () => {
        expect(seatsFor(["a", "b", "c", "d"], "a")).toEqual({left: "b", top: "c", right: "d"});
    });

    it("starts from the player after you, wherever you sit", () => {
        expect(seatsFor(["a", "b", "c", "d"], "c")).toEqual({left: "d", top: "a", right: "b"});
    });
});

describe("backStack", () => {
    const size = CARD_SIZES.small;

    it("shows exactly as many backs as the known card count", () => {
        for (const count of [1, 2, 3]) {
            expect(canvasWidth(backStack(count, size))).toBe((count - 1) * STACK_OFFSET + size.width);
        }
    });

    it("shows a thick stack when the count is hidden", () => {
        expect(canvasWidth(backStack(null, size))).toBeGreaterThan(canvasWidth(backStack(3, size)));
    });

    it("shows UNO only on the top card of the stack", () => {
        const text = toLines(backStack(3, size)).join("");
        expect(text.split("UNO").length - 1).toBe(1);
        expect(text).not.toContain("U│");
    });
});

describe("drawPile", () => {
    it("gets thicker as it fills up", () => {
        const size = CARD_SIZES.medium;
        expect(canvasWidth(drawPile(10, size))).toBeLessThan(canvasWidth(drawPile(80, size)));
    });

    it("says when it is empty", () => {
        expect(toLines(drawPile(0, CARD_SIZES.medium)).join("")).toContain("empty");
    });
});
