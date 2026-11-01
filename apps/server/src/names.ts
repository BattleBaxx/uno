import type {PlayerId} from "@uno/engine";
import {PlayerName, type Names} from "@uno/protocol";

export type NameError = "nameRequired" | "invalidName" | "nameTaken";

export function resolveName(
    names: Names,
    playerId: PlayerId,
    requested: string | null,
): {ok: true; names: Names} | {ok: false; error: NameError} {
    if (requested === null) {
        return playerId in names ? {ok: true, names} : {ok: false, error: "nameRequired"};
    }

    const parsed = PlayerName.safeParse(requested);
    if (!parsed.success) {
        return {ok: false, error: "invalidName"};
    }

    const name = parsed.data;
    const taken = Object.entries(names).some(
        ([id, other]) => id !== playerId && other.toLowerCase() === name.toLowerCase(),
    );
    if (taken) {
        return {ok: false, error: "nameTaken"};
    }

    return {ok: true, names: {...names, [playerId]: name}};
}
