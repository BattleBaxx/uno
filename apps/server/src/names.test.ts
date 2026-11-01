import {describe, it, expect} from "vitest";
import {resolveName} from "./names";

describe("resolveName", () => {
    it("stores the name of a new player", () => {
        expect(resolveName({}, "p1", "alice")).toEqual({ok: true, names: {p1: "alice"}});
    });

    it("trims the name", () => {
        expect(resolveName({}, "p1", "  alice  ")).toEqual({ok: true, names: {p1: "alice"}});
    });

    it("requires a name from a player who has none yet", () => {
        expect(resolveName({}, "p1", null)).toEqual({ok: false, error: "nameRequired"});
    });

    it("lets a returning player reconnect without sending a name", () => {
        const names = {p1: "alice"};
        expect(resolveName(names, "p1", null)).toEqual({ok: true, names});
    });

    it("lets a returning player change their name", () => {
        expect(resolveName({p1: "alice"}, "p1", "ally")).toEqual({ok: true, names: {p1: "ally"}});
    });

    it("refuses a name another player has, ignoring case", () => {
        expect(resolveName({p1: "alice"}, "p2", "ALICE")).toEqual({ok: false, error: "nameTaken"});
    });

    it("lets a player keep their own name", () => {
        expect(resolveName({p1: "alice"}, "p1", "alice")).toEqual({ok: true, names: {p1: "alice"}});
    });

    it("refuses invalid names", () => {
        expect(resolveName({}, "p1", "")).toEqual({ok: false, error: "invalidName"});
        expect(resolveName({}, "p1", "a".repeat(17))).toEqual({ok: false, error: "invalidName"});
        expect(resolveName({}, "p1", "bad\u001bname")).toEqual({ok: false, error: "invalidName"});
    });
});
