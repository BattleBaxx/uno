import {describe, it, expect} from "vitest";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {JOIN_REFUSED_CLOSE_CODE} from "@uno/protocol";
import {roomSocketUrl} from "./api";
import {connect, GIVE_UP_AFTER_MS, type ConnectionStatus, type SocketLike} from "./connection";
import {clearSession, loadSession, saveSession, sessionPath} from "./session";

class FakeSocket implements SocketLike {
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((event: {data: unknown}) => void) | null = null;
    onclose: ((event: {code: number; reason: string}) => void) | null = null;
    constructor(readonly url: string) {}
    send(data: string) {
        this.sent.push(data);
    }
    close() {
        this.onclose?.({code: 1000, reason: ""});
    }
}

function harness() {
    const sockets: FakeSocket[] = [];
    const statuses: [ConnectionStatus, string | undefined][] = [];
    const timers: (() => void)[] = [];
    let clock = 0;
    let token = "";
    const connection = connect({
        url: () => `ws://server/rooms/ABCDEF${token}`,
        onMessage: () => undefined,
        onStatus: (status, reason) => statuses.push([status, reason]),
        createSocket: (url) => {
            const socket = new FakeSocket(url);
            sockets.push(socket);
            return socket;
        },
        schedule: (callback) => timers.push(callback),
        now: () => clock,
    });
    return {
        connection,
        sockets,
        statuses,
        last: () => sockets.at(-1)!,
        runTimers: () => timers.splice(0).forEach((t) => t()),
        tick: (ms: number) => (clock += ms),
        setToken: (value: string) => (token = value),
    };
}

describe("roomSocketUrl", () => {
    it("turns the server address into a websocket address with the token and name", () => {
        expect(roomSocketUrl("http://localhost:8787", "ABCDEF", {name: "alice"})).toBe(
            "ws://localhost:8787/rooms/ABCDEF?name=alice",
        );
        expect(roomSocketUrl("https://uno.example", "ABCDEF", {token: "t1"})).toBe("wss://uno.example/rooms/ABCDEF?token=t1");
    });
});

describe("connect", () => {
    it("reports connecting, then open", () => {
        const h = harness();
        h.last().onopen?.();
        expect(h.statuses).toEqual([
            ["connecting", undefined],
            ["open", undefined],
        ]);
    });

    it("parses messages from the server and ignores garbage", () => {
        const received: unknown[] = [];
        const sockets: FakeSocket[] = [];
        connect({
            url: () => "ws://x",
            onMessage: (m) => received.push(m),
            onStatus: () => undefined,
            createSocket: (url) => {
                const s = new FakeSocket(url);
                sockets.push(s);
                return s;
            },
        });
        sockets[0]!.onmessage?.({data: '{"type":"presence","playerId":"a","connected":true}'});
        sockets[0]!.onmessage?.({data: "not json"});
        expect(received).toEqual([{type: "presence", playerId: "a", connected: true}]);
    });

    it("reconnects after losing a connection, using the latest address", () => {
        const h = harness();
        h.last().onopen?.();
        h.setToken("?token=t1");
        h.last().onclose?.({code: 1006, reason: ""});
        expect(h.statuses.at(-1)).toEqual(["reconnecting", undefined]);
        h.runTimers();
        expect(h.sockets.length).toBe(2);
        expect(h.last().url).toBe("ws://server/rooms/ABCDEF?token=t1");
        h.last().onopen?.();
        expect(h.statuses.at(-1)).toEqual(["open", undefined]);
    });

    it("also reconnects when the room moves to another server (code 1012)", () => {
        const h = harness();
        h.last().onopen?.();
        h.last().onclose?.({code: 1012, reason: "moved"});
        expect(h.statuses.at(-1)).toEqual(["reconnecting", undefined]);
    });

    it("gives up after 30 seconds without a connection", () => {
        const h = harness();
        h.last().onopen?.();
        h.last().onclose?.({code: 1006, reason: ""});
        h.tick(GIVE_UP_AFTER_MS);
        h.runTimers();
        h.last().onclose?.({code: 1006, reason: ""});
        expect(h.statuses.at(-1)).toEqual(["closed", "lost"]);
    });

    it("stops when the server refuses the join, and says why", () => {
        const h = harness();
        h.last().onopen?.();
        h.last().onclose?.({code: JOIN_REFUSED_CLOSE_CODE, reason: "roomFull"});
        expect(h.statuses.at(-1)).toEqual(["closed", "roomFull"]);
        expect(h.sockets.length).toBe(1);
    });

    it("reports an unreachable server instead of retrying forever", () => {
        const h = harness();
        h.last().onclose?.({code: 1006, reason: ""});
        expect(h.statuses.at(-1)).toEqual(["closed", "unreachable"]);
    });

    it("does not reconnect after closing on purpose", () => {
        const h = harness();
        h.last().onopen?.();
        h.connection.close();
        expect(h.statuses.at(-1)).toEqual(["closed", undefined]);
        expect(h.sockets.length).toBe(1);
    });

    it("sends messages as JSON", () => {
        const h = harness();
        h.last().onopen?.();
        h.connection.send({type: "play", cardId: 4});
        expect(h.last().sent).toEqual(['{"type":"play","cardId":4}']);
    });
});

describe("session", () => {
    it("saves, loads and clears the session file", async () => {
        const path = join(await mkdtemp(join(tmpdir(), "uno-")), "uno", "session.json");
        const session = {server: "http://localhost:8787", roomKey: "ABCDEF", token: "t1", name: "alice"};
        expect(await loadSession(path)).toBeNull();
        await saveSession(session, path);
        expect(await loadSession(path)).toEqual(session);
        await clearSession(path);
        expect(await loadSession(path)).toBeNull();
    });

    it("lives in the user's config folder", () => {
        expect(sessionPath({XDG_CONFIG_HOME: "/cfg"})).toBe("/cfg/uno/session.json");
    });
});
