import {describe, it, expect} from "vitest";
import {RoomKey} from "@uno/protocol";
import {generateRoomKey} from "./roomKey";

describe("generateRoomKey", () => {
    it("always produces a valid room key", () => {
        for (let i = 0; i < 1000; i++) {
            expect(RoomKey.safeParse(generateRoomKey()).success).toBe(true);
        }
    });

    it("produces different keys", () => {
        const keys = new Set(Array.from({length: 1000}, generateRoomKey));
        expect(keys.size).toBeGreaterThan(990);
    });
});
