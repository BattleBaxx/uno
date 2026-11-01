import {apply, createLobby, UNO_WINDOW_MS, type Action, type GameEvent, type GameState, type PlayerId} from "@uno/engine";
import {CreateRoomRequest, isUnoCall, parseClientMessage, viewFor, type ServerMessage} from "@uno/protocol";
import {toAction} from "./actions";
import {nextDeadline} from "./deadlines";
import type {Env} from "./index";

type Tokens = Record<string, PlayerId>;
type ChatEntry = {from: PlayerId; text: string};
type Attachment = {playerId: PlayerId};

const CHAT_HISTORY_LIMIT = 100;

export class GameRoom {
    private readonly ctx: DurableObjectState;
    private state: GameState | undefined;
    private tokens: Tokens = {};
    private chat: ChatEntry[] = [];

    constructor(ctx: DurableObjectState, _env: Env) {
        this.ctx = ctx;
        void ctx.blockConcurrencyWhile(async () => {
            this.state = await ctx.storage.get<GameState>("state");
            this.tokens = (await ctx.storage.get<Tokens>("tokens")) ?? {};
            this.chat = (await ctx.storage.get<ChatEntry[]>("chat")) ?? [];
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        if (request.method === "POST" && url.pathname === "/init") {
            return this.init(await request.json());
        }
        if (!this.state) {
            return new Response("room not found", {status: 404});
        }
        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("expected a websocket", {status: 426});
        }
        return this.connect(this.state, url.searchParams.get("token"));
    }

    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
        const {playerId} = ws.deserializeAttachment() as Attachment;
        const parsed = typeof message === "string" ? parseClientMessage(message) : null;
        if (!parsed) {
            send(ws, {type: "error", error: "invalidMessage"});
            return;
        }

        if (parsed.type === "chat") {
            this.addChat({from: playerId, text: parsed.text});
            if (!isUnoCall(parsed.text)) {
                return;
            }
        }

        this.act(toAction(parsed, playerId, Date.now()), ws);
    }

    alarm(): void {
        const now = Date.now();

        if (this.state?.phase === "lobby" && this.state.startsAt !== null && this.state.startsAt <= now) {
            this.act({type: "countdownTimeout", seed: randomSeed(), now});
        }

        if (this.state?.phase === "playing") {
            const expired = this.state.unoWindows.filter((w) => w.openedAt + UNO_WINDOW_MS <= now);
            for (const window of expired) {
                this.act({type: "unoTimeout", playerId: window.playerId, now});
            }
        }

        this.scheduleAlarm();
    }

    private init(body: unknown): Response {
        if (this.state) {
            return new Response("room already exists", {status: 409});
        }

        const settings = CreateRoomRequest.parse(body);
        const hostId = crypto.randomUUID();
        const token = crypto.randomUUID();
        const lobby = createLobby(hostId, settings);
        if (!lobby.ok) {
            return Response.json({error: lobby.error}, {status: 400});
        }

        this.saveTokens({[token]: hostId});
        this.saveState(lobby.state);
        return Response.json({token});
    }

    private connect(state: GameState, token: string | null): Response {
        let playerId: PlayerId;
        let events: GameEvent[] = [];

        if (token !== null) {
            const known = this.tokens[token];
            if (!known) {
                return new Response("unknown token", {status: 403});
            }
            playerId = known;
        } else {
            playerId = crypto.randomUUID();
            const joined = apply(state, {type: "join", playerId});
            if (!joined.ok) {
                return Response.json({error: joined.error}, {status: 409});
            }
            token = crypto.randomUUID();
            this.saveTokens({...this.tokens, [token]: playerId});
            this.saveState(joined.state);
            events = joined.events;
        }

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({playerId} satisfies Attachment);

        send(server, {type: "welcome", roomKey: this.ctx.id.name ?? "", playerId, token});
        for (const entry of this.chat) {
            send(server, {type: "chat", ...entry});
        }
        this.broadcast(events);

        return new Response(null, {status: 101, webSocket: client});
    }

    private act(action: Action, from?: WebSocket): void {
        if (!this.state) {
            return;
        }
        const result = apply(this.state, action);
        if (!result.ok) {
            if (from) {
                send(from, {type: "error", error: result.error});
            }
            return;
        }
        this.saveState(result.state);
        this.broadcast(result.events);
    }

    private broadcast(events: GameEvent[]): void {
        const state = this.state;
        if (!state) {
            return;
        }
        for (const ws of this.ctx.getWebSockets()) {
            const {playerId} = ws.deserializeAttachment() as Attachment;
            if (events.length > 0) {
                send(ws, {type: "events", events});
            }
            send(ws, {type: "view", view: viewFor(state, playerId)});
        }
    }

    private addChat(entry: ChatEntry): void {
        this.chat = [...this.chat, entry].slice(-CHAT_HISTORY_LIMIT);
        void this.ctx.storage.put("chat", this.chat);
        for (const ws of this.ctx.getWebSockets()) {
            send(ws, {type: "chat", ...entry});
        }
    }

    private saveState(state: GameState): void {
        this.state = state;
        void this.ctx.storage.put("state", state);
        this.scheduleAlarm();
    }

    private saveTokens(tokens: Tokens): void {
        this.tokens = tokens;
        void this.ctx.storage.put("tokens", tokens);
    }

    private scheduleAlarm(): void {
        const deadline = this.state ? nextDeadline(this.state) : null;
        if (deadline === null) {
            void this.ctx.storage.deleteAlarm();
        } else {
            void this.ctx.storage.setAlarm(deadline);
        }
    }
}

function send(ws: WebSocket, message: ServerMessage): void {
    try {
        ws.send(JSON.stringify(message));
    } catch {
        return;
    }
}

function randomSeed(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
