import {CreateRoomRequest, RoomKey, type CreateRoomResponse} from "@uno/protocol";
import {generateRoomKey} from "./roomKey";

export {GameRoom} from "./room";

export type Env = {
    ROOMS: DurableObjectNamespace;
};

const ROOM_KEY_ATTEMPTS = 5;

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === "/rooms") {
            return createRoom(request, env);
        }

        const match = url.pathname.match(/^\/rooms\/([^/]+)$/);
        if (match) {
            const key = RoomKey.safeParse(match[1]);
            if (!key.success) {
                return new Response("invalid room key", {status: 400});
            }
            return env.ROOMS.getByName(key.data).fetch(request);
        }

        return new Response("not found", {status: 404});
    },
};

async function createRoom(request: Request, env: Env): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        body = {};
    }
    const settings = CreateRoomRequest.safeParse(body);
    if (!settings.success) {
        return new Response("invalid settings", {status: 400});
    }

    for (let attempt = 0; attempt < ROOM_KEY_ATTEMPTS; attempt++) {
        const roomKey = generateRoomKey();
        const response = await env.ROOMS.getByName(roomKey).fetch("https://room/init", {
            method: "POST",
            body: JSON.stringify(settings.data),
        });
        if (response.status === 409) {
            continue;
        }
        if (!response.ok) {
            return response;
        }
        const {token} = (await response.json()) as {token: string};
        return Response.json({roomKey, token} satisfies CreateRoomResponse);
    }

    return new Response("could not find a free room key", {status: 503});
}
