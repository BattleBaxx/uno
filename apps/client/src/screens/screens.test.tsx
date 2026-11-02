import {describe, it, expect} from "vitest";
import {renderToString} from "ink";
import {createDeck, type Card} from "@uno/engine";
import type {FinishedView, PlayingView} from "@uno/protocol";
import {GameOver} from "./GameOver";
import {Table} from "./Table";

const deck = createDeck();
const pick = (predicate: (c: Card) => boolean) => deck.find(predicate)!;

const view = (overrides: Partial<PlayingView> = {}): PlayingView => ({
    phase: "playing",
    you: "a",
    names: {a: "alice", b: "bob", c: "carol"},
    hand: deck.slice(0, 5),
    players: [
        {id: "a", cardCount: 5},
        {id: "b", cardCount: 2},
        {id: "c", cardCount: null},
    ],
    currentPlayer: "a",
    direction: 1,
    topCard: pick((c) => c.kind === "number" && c.color === "red"),
    currentColor: "red",
    pendingDraw: 0,
    hasDrawn: false,
    drawPileCount: 60,
    ...overrides,
});

const table = (overrides: Partial<PlayingView> = {}, picking: number | null = null) =>
    renderToString(
        <Table
            view={view(overrides)}
            tier="medium"
            width={100}
            height={30}
            selected={0}
            picking={picking}
            offline={["c"]}
            slide={null}
            now={0}
        />,
        {columns: 100},
    );

describe("Table", () => {
    it("seats the opponents with their names and card counts", () => {
        const output = table();
        expect(output).toContain("bob");
        expect(output).toContain("2 cards");
        expect(output).toContain("carol");
        expect(output).toContain("many cards");
    });

    it("says whose turn it is", () => {
        expect(table()).toContain("your turn");
        expect(table({currentPlayer: "b"})).toContain("bob's turn");
    });

    it("shows the current color, the draw pile and the direction", () => {
        const output = table({currentColor: "blue", direction: -1});
        expect(output).toContain("BLUE");
        expect(output).toContain("draw · 60");
        expect(output).toContain("counter-clockwise");
    });

    it("warns about a pending stack", () => {
        expect(table({pendingDraw: 4})).toContain("+4 pending");
    });

    it("shows the color picker while choosing a wild's color", () => {
        const output = table({}, 2);
        expect(output).toContain("choose a color");
        for (const color of ["red", "yellow", "green", "blue"]) {
            expect(output).toContain(color);
        }
    });

    it("draws your hand", () => {
        expect(table()).toContain("╭");
    });
});

describe("GameOver", () => {
    const finished = (winner: string): FinishedView => ({phase: "finished", you: "a", names: {a: "alice", b: "bob"}, winner});

    it("congratulates the winner", () => {
        expect(renderToString(<GameOver view={finished("a")} showLogo={false} />)).toContain("you won!");
    });

    it("tells everyone else who won", () => {
        const output = renderToString(<GameOver view={finished("b")} showLogo={false} />);
        expect(output).toContain("bob won the game");
        expect(output).toContain("press enter to go back");
    });
});
