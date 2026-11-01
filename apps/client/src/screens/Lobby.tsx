import {Box, Text} from "ink";
import {MAX_PLAYERS} from "@uno/engine";
import type {LobbyView} from "@uno/protocol";
import {Logo} from "../ui/Logo";

type Props = {
    view: LobbyView;
    roomKey: string;
    offline: string[];
    now: number;
    showLogo: boolean;
};

export function Lobby({view, roomKey, offline, now, showLogo}: Props) {
    const isHost = view.host === view.you;
    const secondsLeft = view.startsAt === null ? null : Math.max(0, Math.ceil((view.startsAt - now) / 1000));
    const hostName = view.names[view.host] ?? "the host";

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            {showLogo ? (
                <Box marginBottom={2}>
                    <Logo />
                </Box>
            ) : null}
            <Text color="gray">room key</Text>
            <Text bold color="yellow">
                {roomKey}
            </Text>
            <Text color="gray">share it with your friends</Text>

            <Box flexDirection="column" marginTop={1} width={28}>
                <Text bold>
                    players ({view.players.length}/{MAX_PLAYERS})
                </Text>
                {view.players.map((id) => (
                    <Text key={id}>
                        <Text color="yellow">{id === view.host ? "★ " : "  "}</Text>
                        <Text bold={id === view.you}>{view.names[id] ?? "someone"}</Text>
                        <Text color={offline.includes(id) ? "gray" : "green"}>{offline.includes(id) ? " ○" : " ●"}</Text>
                        <Text color="gray">{id === view.you ? "  you" : ""}</Text>
                    </Text>
                ))}
            </Box>

            <Box marginTop={1}>
                <Text color="gray">cards per hand </Text>
                <Text bold>{view.settings.handSize}</Text>
            </Box>

            <Box marginTop={1} height={1}>
                {secondsLeft !== null ? (
                    <Text bold color="yellow">
                        starting in {secondsLeft}…
                    </Text>
                ) : isHost ? (
                    <Text color={view.players.length >= 2 ? "green" : "gray"}>
                        {view.players.length >= 2 ? "press enter to start the game" : "waiting for players to join…"}
                    </Text>
                ) : (
                    <Text color="gray">waiting for {hostName} to start…</Text>
                )}
            </Box>
        </Box>
    );
}
