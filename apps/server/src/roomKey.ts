import {ROOM_KEY_ALPHABET, ROOM_KEY_LENGTH} from "@uno/protocol";

export function generateRoomKey(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(ROOM_KEY_LENGTH));
    return Array.from(bytes, (b) => ROOM_KEY_ALPHABET.charAt(b % ROOM_KEY_ALPHABET.length)).join("");
}
