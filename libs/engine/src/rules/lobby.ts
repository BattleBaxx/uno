import type {LobbyState, Player, PlayerId, PlayingState, Settings} from "../state";
import type {JoinAction, StartAction} from "../action";
import {createDeck, shuffle} from "../cards/deck";
import {nextRandom} from "../cards/random";
import {fail, ok, type Result} from "../result";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const MIN_HAND_SIZE = 1;
export const MAX_HAND_SIZE = 20;
export const DEFAULT_HAND_SIZE = 7;

export function createLobby(hostId: PlayerId, settings: Settings): Result<LobbyState> {
    const {handSize} = settings;
    if (!Number.isInteger(handSize) || handSize < MIN_HAND_SIZE || handSize > MAX_HAND_SIZE) {
        return fail("invalidHandSize");
    }

    return ok({phase: "lobby", players: [hostId], host: hostId, settings: {handSize}});
}

export function join(state: LobbyState, action: JoinAction): Result {
    if (state.players.includes(action.playerId)) {
        return fail("alreadyJoined");
    }
    if (state.players.length >= MAX_PLAYERS) {
        return fail("roomFull");
    }

    return ok({...state, players: [...state.players, action.playerId]}, [{type: "joined", playerId: action.playerId}]);
}

export function start(state: LobbyState, action: StartAction): Result {
    if (action.playerId !== state.host) {
        return fail("notHost");
    }
    if (state.players.length < MIN_PLAYERS) {
        return fail("notEnoughPlayers");
    }

    const shuffled = shuffle(createDeck(), action.seed);
    const drawPile = shuffled.items;
    let rngState = shuffled.rngState;

    const players: Player[] = state.players.map((id) => ({
        id,
        hand: drawPile.splice(-state.settings.handSize),
    }));

    // At most 4 × 20 = 80 of 108 cards are dealt, so the pile is never empty here.
    let firstCard = drawPile.pop()!;

    while (firstCard.kind !== "number") {
        const random = nextRandom(rngState);
        rngState = random.rngState;
        const position = Math.floor(random.value * (drawPile.length + 1));
        drawPile.splice(position, 0, firstCard);
        firstCard = drawPile.pop()!;
    }

    const playing: PlayingState = {
        phase: "playing",
        rngState,
        drawPile,
        discardPile: [firstCard],
        currentColor: firstCard.color,
        players,
        currentPlayerIndex: 0,
        hasDrawn: false,
        direction: 1,
        pendingDraw: 0,
        unoWindows: [],
    };
    return ok(playing, [{type: "started"}]);
}
