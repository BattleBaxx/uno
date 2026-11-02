import type {Card, Color, GameEvent, PlayerId} from "@uno/engine";
import type {JoinError, Names} from "@uno/protocol";
import type {Paint} from "../art/canvas";

export type Part = {text: string; color?: Paint; bold?: boolean};
export type LogLine = Part[];

export function describeEntry(
    entry: {kind: "event"; event: GameEvent} | {kind: "refused"; text: string},
    names: Names,
    you: PlayerId | null,
): LogLine {
    return entry.kind === "event" ? describeEvent(entry.event, names, you) : [{text: entry.text, color: "red"}];
}

export function describeEvent(event: GameEvent, names: Names, you: PlayerId | null): LogLine {
    const who = (id: PlayerId): Part => ({text: id === you ? "you" : (names[id] ?? "someone"), bold: true});

    switch (event.type) {
        case "joined":
            return [who(event.playerId), {text: " joined"}];
        case "removed":
            return [who(event.playerId), {text: " left the game"}];
        case "hostChanged":
            return [who(event.playerId), {text: " is now the host"}];
        case "countdownStarted":
            return [{text: "the game starts in 3 seconds…", color: "yellow"}];
        case "countdownCancelled":
            return [{text: "start cancelled: not enough players", color: "gray"}];
        case "started":
            return [{text: "the game has started!", color: "yellow", bold: true}];
        case "played":
            return [who(event.playerId), {text: " played "}, ...describeCard(event.card, event.color)];
        case "drew":
            return [who(event.playerId), {text: drewText(event.count, event.reason)}];
        case "passed":
            return [who(event.playerId), {text: " passed"}];
        case "calledUno":
            return [who(event.playerId), {text: " called "}, {text: "UNO!", color: "yellow", bold: true}];
        case "caught":
            return [who(event.by), {text: " caught "}, who(event.playerId), {text: " without UNO!", color: "red"}];
        case "unoTimedOut":
            return [who(event.playerId), {text: " forgot to call UNO", color: "red"}];
        case "missedUno":
            return [who(event.playerId), {text: " tried to finish without calling UNO", color: "red"}];
        case "won":
            return [who(event.playerId), {text: " won the game!", color: "yellow", bold: true}];
    }
}

export function describeCard(card: Card, chosen: Color): Part[] {
    switch (card.kind) {
        case "number":
            return [{text: `${card.color} ${card.value}`, color: card.color, bold: true}];
        case "skip":
            return [{text: `${card.color} skip`, color: card.color, bold: true}];
        case "reverse":
            return [{text: `${card.color} reverse`, color: card.color, bold: true}];
        case "drawTwo":
            return [{text: `${card.color} +2`, color: card.color, bold: true}];
        case "wild":
            return [{text: "wild", bold: true}, {text: " → "}, {text: chosen, color: chosen, bold: true}];
        case "wildDrawFour":
            return [{text: "wild +4", bold: true}, {text: " → "}, {text: chosen, color: chosen, bold: true}];
    }
}

function drewText(count: number, reason: "choice" | "stack" | "unoPenalty" | "falseCall"): string {
    const cards = count === 1 ? "1 card" : `${count} cards`;
    if (count === 0) {
        return " could not draw: no cards are left";
    }
    switch (reason) {
        case "choice":
            return ` drew ${cards}`;
        case "stack":
            return ` drew ${cards} from the stack`;
        case "unoPenalty":
            return ` drew ${cards} as a penalty`;
        case "falseCall":
            return ` called UNO for nothing and drew ${cards}`;
    }
}

const ERROR_TEXT: Record<JoinError | "invalidMessage", string> = {
    roomNotFound: "That room does not exist.",
    unknownToken: "Your saved seat is no longer valid.",
    nameRequired: "Please enter a name.",
    invalidName: "Names can be 1–16 characters.",
    nameTaken: "Someone in that room already has that name.",
    invalidMessage: "The server did not understand that.",
    wrongPhase: "You can't do that right now.",
    invalidHandSize: "The hand size must be between 1 and 20.",
    alreadyJoined: "You are already in this room.",
    roomFull: "That room is full.",
    notHost: "Only the host can start the game.",
    notEnoughPlayers: "You need at least 2 players to start.",
    alreadyStarting: "The game is already starting.",
    notYourTurn: "It's not your turn.",
    cardNotInHand: "You don't have that card.",
    cardNotPlayable: "That card can't be played now.",
    colorRequired: "Choose a color for the wild card.",
    alreadyDrawn: "You already drew this turn.",
    mustDrawFirst: "You can only pass after drawing.",
    notInGame: "You are not in this game.",
};

export function errorText(code: string): string {
    return ERROR_TEXT[code as JoinError] ?? "Something went wrong.";
}
