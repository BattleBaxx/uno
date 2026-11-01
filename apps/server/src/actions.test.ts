import {describe, it, expect} from "vitest";
import {toAction} from "./actions";

describe("toAction", () => {
    it("adds the player and the time the server received it", () => {
        expect(toAction({type: "start"}, "alice", 1000)).toEqual({type: "start", playerId: "alice", now: 1000});
        expect(toAction({type: "play", cardId: 42, color: "blue"}, "alice", 1000)).toEqual({
            type: "play",
            playerId: "alice",
            cardId: 42,
            color: "blue",
            now: 1000,
        });
        expect(toAction({type: "draw"}, "bob", 1000)).toEqual({type: "draw", playerId: "bob"});
        expect(toAction({type: "pass"}, "bob", 1000)).toEqual({type: "pass", playerId: "bob"});
        expect(toAction({type: "callUno"}, "bob", 1000)).toEqual({type: "callUno", playerId: "bob", now: 1000});
    });

    it("turns an uno chat message into an UNO call", () => {
        expect(toAction({type: "chat", text: "uno"}, "carol", 5000)).toEqual({
            type: "callUno",
            playerId: "carol",
            now: 5000,
        });
    });
});
