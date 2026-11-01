import {JOIN_REFUSED_CLOSE_CODE, type ClientMessage, type ServerMessage} from "@uno/protocol";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

export type SocketLike = {
    send(data: string): void;
    close(code?: number): void;
    onopen: (() => void) | null;
    onmessage: ((event: {data: unknown}) => void) | null;
    onclose: ((event: {code: number; reason: string}) => void) | null;
};

export type ConnectionOptions = {
    url: () => string;
    onMessage: (message: ServerMessage) => void;
    onStatus: (status: ConnectionStatus, reason?: string) => void;
    createSocket?: (url: string) => SocketLike;
    schedule?: (callback: () => void, ms: number) => void;
    now?: () => number;
};

export type Connection = {
    send(message: ClientMessage): void;
    close(): void;
};

export const RETRY_DELAYS_MS = [500, 1000, 2000, 4000];
export const GIVE_UP_AFTER_MS = 30_000;

export function connect(options: ConnectionOptions): Connection {
    const createSocket = options.createSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
    const schedule = options.schedule ?? ((callback, ms) => void setTimeout(callback, ms));
    const now = options.now ?? Date.now;

    let socket: SocketLike | null = null;
    let closedByUs = false;
    let everOpened = false;
    let attempt = 0;
    let lostAt: number | null = null;

    const open = () => {
        const current = createSocket(options.url());
        socket = current;
        current.onopen = () => {
            everOpened = true;
            attempt = 0;
            lostAt = null;
            options.onStatus("open");
        };
        current.onmessage = (event) => {
            const message = parse(event.data);
            if (message) {
                options.onMessage(message);
            }
        };
        current.onclose = (event) => {
            if (socket !== current) {
                return;
            }
            socket = null;
            if (closedByUs) {
                options.onStatus("closed");
                return;
            }
            if (event.code === JOIN_REFUSED_CLOSE_CODE) {
                options.onStatus("closed", event.reason);
                return;
            }
            if (!everOpened) {
                options.onStatus("closed", "unreachable");
                return;
            }
            lostAt ??= now();
            if (now() - lostAt >= GIVE_UP_AFTER_MS) {
                options.onStatus("closed", "lost");
                return;
            }
            options.onStatus("reconnecting");
            const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 4000;
            attempt++;
            schedule(open, delay);
        };
    };

    options.onStatus("connecting");
    open();

    return {
        send(message) {
            socket?.send(JSON.stringify(message));
        },
        close() {
            closedByUs = true;
            socket?.close(1000);
        },
    };
}

function parse(data: unknown): ServerMessage | null {
    if (typeof data !== "string") {
        return null;
    }
    try {
        return JSON.parse(data) as ServerMessage;
    } catch {
        return null;
    }
}
