import {createLobby, type GameState, type PlayerId} from "@uno/engine";
import {CreateRoomRequest} from "@uno/protocol";
import type {Env} from "./index";

type Tokens = Record<string, PlayerId>;

export class GameRoom {
    private readonly ctx: DurableObjectState;

    constructor(ctx: DurableObjectState, _env: Env) {
        this.ctx = ctx;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        if (request.method === "POST" && url.pathname === "/init") {
            return this.init(request);
        }
        if (!(await this.ctx.storage.get<GameState>("state"))) {
            return new Response("room not found", {status: 404});
        }
        return new Response("not implemented yet", {status: 501});
    }

    private async init(request: Request): Promise<Response> {
        if (await this.ctx.storage.get<GameState>("state")) {
            return new Response("room already exists", {status: 409});
        }

        const settings = CreateRoomRequest.parse(await request.json());
        const hostId = crypto.randomUUID();
        const token = crypto.randomUUID();
        const lobby = createLobby(hostId, settings);
        if (!lobby.ok) {
            return Response.json({error: lobby.error}, {status: 400});
        }

        const tokens: Tokens = {[token]: hostId};
        await this.ctx.storage.put("state", lobby.state);
        await this.ctx.storage.put("tokens", tokens);
        return Response.json({token});
    }
}
