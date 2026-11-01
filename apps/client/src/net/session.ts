import {mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {homedir} from "node:os";
import {dirname, join} from "node:path";

export type Session = {server: string; roomKey: string; token: string; name: string};

export function sessionPath(env: NodeJS.ProcessEnv = process.env): string {
    const config = env["XDG_CONFIG_HOME"] || join(homedir(), ".config");
    return join(config, "uno", "session.json");
}

export async function loadSession(path = sessionPath()): Promise<Session | null> {
    try {
        const data: unknown = JSON.parse(await readFile(path, "utf8"));
        return isSession(data) ? data : null;
    } catch {
        return null;
    }
}

export async function saveSession(session: Session, path = sessionPath()): Promise<void> {
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, JSON.stringify(session, null, 2), {mode: 0o600});
}

export async function clearSession(path = sessionPath()): Promise<void> {
    await rm(path, {force: true});
}

function isSession(data: unknown): data is Session {
    if (typeof data !== "object" || data === null) {
        return false;
    }
    const fields = data as Record<string, unknown>;
    return ["server", "roomKey", "token", "name"].every((key) => typeof fields[key] === "string");
}
