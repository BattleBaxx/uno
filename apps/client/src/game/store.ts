import type {GameEvent, PlayerId} from "@uno/engine";
import type {Names, PlayerView, ServerMessage} from "@uno/protocol";
import type {ConnectionStatus} from "../net/connection";
import {errorText} from "./log";

export const LOG_LIMIT = 200;
export const CHAT_LIMIT = 100;

export type ChatLine = {from: PlayerId; text: string};
export type Notice = {text: string; at: number};

export type ClientState = {
    status: ConnectionStatus;
    reason: string | null;
    roomKey: string | null;
    you: PlayerId | null;
    token: string | null;
    view: PlayerView | null;
    names: Names;
    log: GameEvent[];
    chat: ChatLine[];
    offline: PlayerId[];
    notice: Notice | null;
};

export const INITIAL_STATE: ClientState = {
    status: "connecting",
    reason: null,
    roomKey: null,
    you: null,
    token: null,
    view: null,
    names: {},
    log: [],
    chat: [],
    offline: [],
    notice: null,
};

export type ClientEvent =
    | {type: "reset"}
    | {type: "status"; status: ConnectionStatus; reason?: string}
    | {type: "message"; message: ServerMessage; now: number};

export function reduce(state: ClientState, event: ClientEvent): ClientState {
    if (event.type === "reset") {
        return INITIAL_STATE;
    }
    if (event.type === "status") {
        return {...state, status: event.status, reason: event.reason ?? null};
    }

    const message = event.message;
    switch (message.type) {
        case "welcome":
            return {...state, roomKey: message.roomKey, you: message.playerId, token: message.token, chat: []};
        case "view":
            return {...state, view: message.view, names: {...state.names, ...message.view.names}};
        case "events":
            return {...state, log: [...state.log, ...message.events].slice(-LOG_LIMIT)};
        case "chat":
            return {...state, chat: [...state.chat, {from: message.from, text: message.text}].slice(-CHAT_LIMIT)};
        case "presence": {
            const offline = state.offline.filter((id) => id !== message.playerId);
            return {...state, offline: message.connected ? offline : [...offline, message.playerId]};
        }
        case "error":
            return {...state, notice: {text: errorText(message.error), at: event.now}};
    }
}
