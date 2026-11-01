import {useCallback, useEffect, useReducer, useRef} from "react";
import type {ClientMessage} from "@uno/protocol";
import {INITIAL_STATE, reduce} from "../game/store";
import {roomSocketUrl} from "./api";
import {connect, type Connection} from "./connection";
import {clearSession, saveSession} from "./session";

export type RoomTarget = {roomKey: string; name: string; token?: string};

export function useRoom(server: string, target: RoomTarget | null) {
    const [state, dispatch] = useReducer(reduce, INITIAL_STATE);
    const connection = useRef<Connection | null>(null);

    useEffect(() => {
        if (!target) {
            return;
        }
        dispatch({type: "reset"});
        let token = target.token;

        const current = connect({
            url: () => roomSocketUrl(server, target.roomKey, {token, name: target.name}),
            onMessage: (message) => {
                if (message.type === "welcome") {
                    token = message.token;
                    void saveSession({server, roomKey: message.roomKey, token: message.token, name: target.name});
                }
                dispatch({type: "message", message, now: Date.now()});
            },
            onStatus: (status, reason) => {
                dispatch({type: "status", status, reason});
                if (status === "closed" && (reason === "unknownToken" || reason === "roomNotFound")) {
                    void clearSession();
                }
            },
        });
        connection.current = current;

        return () => {
            current.close();
            connection.current = null;
        };
    }, [server, target]);

    const send = useCallback((message: ClientMessage) => connection.current?.send(message), []);
    return {state, send};
}
