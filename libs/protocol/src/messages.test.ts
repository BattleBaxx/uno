import {describe, it, expect} from "vitest";
import {CreateRoomRequest, parseClientMessage, RoomKey} from "./messages";

describe("parseClientMessage", () => {
    it("accepts every valid message", () => {
        expect(parseClientMessage('{"type":"start"}')).toEqual({type: "start"});
        expect(parseClientMessage('{"type":"play","cardId":42}')).toEqual({type: "play", cardId: 42});
        expect(parseClientMessage('{"type":"play","cardId":7,"color":"blue"}')).toEqual({
            type: "play",
            cardId: 7,
            color: "blue",
        });
        expect(parseClientMessage('{"type":"draw"}')).toEqual({type: "draw"});
        expect(parseClientMessage('{"type":"pass"}')).toEqual({type: "pass"});
        expect(parseClientMessage('{"type":"callUno"}')).toEqual({type: "callUno"});
    });

    it("rejects text that is not JSON", () => {
        expect(parseClientMessage("play card 42")).toBeNull();
    });

    it("rejects unknown message types", () => {
        expect(parseClientMessage('{"type":"cheat"}')).toBeNull();
        expect(parseClientMessage("{}")).toBeNull();
    });

    it("rejects a play with a bad or missing card id", () => {
        expect(parseClientMessage('{"type":"play"}')).toBeNull();
        expect(parseClientMessage('{"type":"play","cardId":"lol"}')).toBeNull();
        expect(parseClientMessage('{"type":"play","cardId":4.5}')).toBeNull();
        expect(parseClientMessage('{"type":"play","cardId":-1}')).toBeNull();
    });

    it("rejects a color that does not exist", () => {
        expect(parseClientMessage('{"type":"play","cardId":1,"color":"purple"}')).toBeNull();
    });

    it("drops fields the client is not allowed to send", () => {
        const parsed = parseClientMessage('{"type":"draw","playerId":"bob","now":0,"seed":1}');
        expect(parsed).toEqual({type: "draw"});
    });
});

describe("CreateRoomRequest", () => {
    it("defaults the hand size to 7", () => {
        expect(CreateRoomRequest.parse({})).toEqual({handSize: 7});
    });

    it("accepts hand sizes from 1 to 20", () => {
        expect(CreateRoomRequest.parse({handSize: 1})).toEqual({handSize: 1});
        expect(CreateRoomRequest.parse({handSize: 20})).toEqual({handSize: 20});
    });

    it("rejects hand sizes outside 1–20, fractions and strings", () => {
        for (const handSize of [0, 21, 7.5, "7"]) {
            expect(CreateRoomRequest.safeParse({handSize}).success).toBe(false);
        }
    });
});

describe("RoomKey", () => {
    it("accepts 6 characters from the alphabet", () => {
        expect(RoomKey.safeParse("K7QX2M").success).toBe(true);
    });

    it("rejects look-alike characters, lowercase and wrong lengths", () => {
        for (const key of ["K7QX0M", "K7QXOM", "K7QX1M", "K7QXIM", "k7qx2m", "K7QX2", "K7QX2MM"]) {
            expect(RoomKey.safeParse(key).success).toBe(false);
        }
    });
});
