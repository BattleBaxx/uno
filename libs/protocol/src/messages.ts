import {z} from "zod";
import {
    DEFAULT_HAND_SIZE,
    MAX_HAND_SIZE,
    MIN_HAND_SIZE,
    type ActionError,
    type Color,
    type PlayerId,
} from "@uno/engine";
import type {PlayerView} from "./view";

export const ROOM_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_KEY_LENGTH = 6;

export const RoomKey = z.string().regex(new RegExp(`^[${ROOM_KEY_ALPHABET}]{${ROOM_KEY_LENGTH}}$`));

const ColorSchema: z.ZodType<Color> = z.enum(["red", "yellow", "green", "blue"]);

export const CreateRoomRequest = z.object({
    handSize: z.number().int().min(MIN_HAND_SIZE).max(MAX_HAND_SIZE).default(DEFAULT_HAND_SIZE),
});
export type CreateRoomRequest = z.infer<typeof CreateRoomRequest>;

export type CreateRoomResponse = {roomKey: string};

export const ClientMessage = z.discriminatedUnion("type", [
    z.object({type: z.literal("start")}),
    z.object({type: z.literal("play"), cardId: z.number().int().nonnegative(), color: ColorSchema.optional()}),
    z.object({type: z.literal("draw")}),
    z.object({type: z.literal("pass")}),
    z.object({type: z.literal("callUno")}),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export function parseClientMessage(raw: string): ClientMessage | null {
    let json: unknown;
    try {
        json = JSON.parse(raw);
    } catch {
        return null;
    }
    const result = ClientMessage.safeParse(json);
    return result.success ? result.data : null;
}

export type ServerMessage =
    | {type: "welcome"; roomKey: string; playerId: PlayerId; token: string}
    | {type: "view"; view: PlayerView}
    | {type: "error"; error: ActionError | "invalidMessage"};
