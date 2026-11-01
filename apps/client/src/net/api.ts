import type {CreateRoomResponse} from "@uno/protocol";

export async function createRoom(server: string, handSize: number): Promise<CreateRoomResponse> {
    const response = await fetch(new URL("/rooms", server), {method: "POST", body: JSON.stringify({handSize})});
    if (!response.ok) {
        throw new Error(`the server refused to create a room (${response.status})`);
    }
    return (await response.json()) as CreateRoomResponse;
}

export function roomSocketUrl(server: string, roomKey: string, params: {token?: string; name?: string}): string {
    const url = new URL(`/rooms/${roomKey}`, server);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    if (params.token) {
        url.searchParams.set("token", params.token);
    }
    if (params.name) {
        url.searchParams.set("name", params.name);
    }
    return url.toString();
}
