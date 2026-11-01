import {UNO_WINDOW_MS, type GameState} from "@uno/engine";

export function nextDeadline(state: GameState): number | null {
    switch (state.phase) {
        case "lobby":
            return state.startsAt;
        case "playing": {
            const deadlines = state.unoWindows.map((w) => w.openedAt + UNO_WINDOW_MS);
            return deadlines.length > 0 ? Math.min(...deadlines) : null;
        }
        case "finished":
            return null;
    }
}
