import {describe, it, expect} from "vitest";
import type {Part} from "./log";
import {scroll, scrollWindow, wrapParts} from "./wrap";

const text = (lines: Part[][]) => lines.map((line) => line.map((p) => p.text).join(""));

describe("wrapParts", () => {
    it("keeps a short line as one line", () => {
        expect(text(wrapParts([{text: "bob joined"}], 20))).toEqual(["bob joined"]);
    });

    it("wraps at word boundaries without trailing spaces", () => {
        expect(text(wrapParts([{text: "alice played red 7 and bob drew 2 cards"}], 16))).toEqual([
            "alice played red",
            "7 and bob drew 2",
            "cards",
        ]);
    });

    it("never makes a line longer than the width", () => {
        const lines = text(wrapParts([{text: "a ".repeat(50)}, {text: "supercalifragilistic"}], 7));
        for (const line of lines) {
            expect(line.length).toBeLessThanOrEqual(7);
        }
    });

    it("breaks words that are longer than the whole line", () => {
        expect(text(wrapParts([{text: "aaaaaaaaaa"}], 4))).toEqual(["aaaa", "aaaa", "aa"]);
    });

    it("keeps colors and bold on the right words across lines", () => {
        const lines = wrapParts([{text: "carol", bold: true}, {text: " played "}, {text: "blue skip", color: "blue"}], 14);
        expect(text(lines)).toEqual(["carol played", "blue skip"]);
        expect(lines[0]![0]).toEqual({text: "carol", bold: true});
        expect(lines[1]![0]).toEqual({text: "blue skip", color: "blue"});
    });
});

describe("scrollWindow", () => {
    const lines = Array.from({length: 10}, (_, i) => i);

    it("shows the newest lines when following the bottom", () => {
        expect(scrollWindow(lines, 3, null)).toEqual({visible: [7, 8, 9], newerHidden: 0, olderHidden: 7});
    });

    it("shows older lines when scrolled up", () => {
        expect(scrollWindow(lines, 3, 4)).toEqual({visible: [2, 3, 4], newerHidden: 5, olderHidden: 2});
    });

    it("never scrolls above the first line", () => {
        expect(scrollWindow(lines, 3, 0).visible).toEqual([0, 1, 2]);
    });

    it("shows everything when it fits", () => {
        expect(scrollWindow([1, 2], 5, null)).toEqual({visible: [1, 2], newerHidden: 0, olderHidden: 0});
    });
});

describe("scroll", () => {
    it("scrolls up from the bottom", () => {
        expect(scroll(null, -3, 10, 3)).toBe(6);
    });

    it("goes back to following the bottom when scrolled all the way down", () => {
        expect(scroll(6, 3, 10, 3)).toBeNull();
        expect(scroll(6, 50, 10, 3)).toBeNull();
    });

    it("stops at the top", () => {
        expect(scroll(4, -50, 10, 3)).toBe(2);
    });

    it("stays at the bottom when everything fits", () => {
        expect(scroll(null, -3, 2, 5)).toBeNull();
    });
});
