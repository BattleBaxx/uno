import {useState} from "react";
import {Box, Text, useInput} from "ink";
import type {ClientMessage} from "@uno/protocol";
import type {Tier} from "../art/size";
import {describeEvent, errorText} from "../game/log";
import type {ClientState} from "../game/store";
import {Sidebar} from "../ui/Sidebar";
import type {TerminalSize} from "../ui/useTerminalSize";
import {useNow} from "../ui/useNow";
import {Lobby} from "./Lobby";

const NOTICE_MS = 3000;

type Props = {
    state: ClientState;
    send: (message: ClientMessage) => void;
    tier: Tier;
    size: TerminalSize;
    onLeave: () => void;
};

export function Room({state, send, tier, size, onLeave}: Props) {
    const [focus, setFocus] = useState<"main" | "chat">("main");
    const [chat, setChat] = useState("");
    const [confirmLeave, setConfirmLeave] = useState(false);
    const counting = state.view?.phase === "lobby" && state.view.startsAt !== null;
    const showingNotice = state.notice !== null && Date.now() - state.notice.at < NOTICE_MS;
    const now = useNow(counting || showingNotice ? 250 : null);

    useInput((_, key) => {
        if (state.status === "closed") {
            if (key.return || key.escape) {
                onLeave();
            }
            return;
        }
        if (key.tab) {
            setFocus((f) => (f === "main" ? "chat" : "main"));
            return;
        }
        if (focus === "chat") {
            if (key.escape) {
                setFocus("main");
            }
            return;
        }
        if (confirmLeave) {
            if (key.return) {
                onLeave();
            }
            if (key.escape) {
                setConfirmLeave(false);
            }
            return;
        }
        if (key.escape) {
            setConfirmLeave(true);
            return;
        }
        if (key.return && state.view?.phase === "lobby" && state.view.host === state.you) {
            send({type: "start"});
        }
    });

    if (state.status === "closed") {
        return <Closed reason={state.reason} />;
    }

    const sendChat = (text: string) => {
        if (text.trim() !== "") {
            send({type: "chat", text});
            setChat("");
        }
    };

    const notice = state.notice && now - state.notice.at < NOTICE_MS ? state.notice.text : null;
    const showSidebar = tier !== "small" || focus === "chat";
    const showMain = tier !== "small" || focus === "main";
    const sidebarWidth = tier === "small" ? size.columns : Math.min(48, Math.max(30, Math.round(size.columns * 0.28)));
    const lastLog = state.log.at(-1);

    return (
        <Box flexDirection="column" width={size.columns} height={size.rows} overflow="hidden">
            {state.status === "reconnecting" ? (
                <Text backgroundColor="yellow" color="black" bold>
                    {" reconnecting… ".padEnd(size.columns)}
                </Text>
            ) : null}
            <Box flexDirection="row" flexGrow={1}>
                {showMain ? (
                    <Box flexDirection="column" flexGrow={1}>
                        {state.view?.phase === "lobby" && state.roomKey ? (
                            <Lobby
                                view={state.view}
                                roomKey={state.roomKey}
                                offline={state.offline}
                                now={now}
                                showLogo={tier !== "small"}
                            />
                        ) : state.view?.phase === "playing" ? (
                            <Placeholder text="the game has started — the table arrives in the next piece" />
                        ) : state.view?.phase === "finished" ? (
                            <Placeholder text={`${state.view.names[state.view.winner] ?? "someone"} won the game!`} />
                        ) : (
                            <Placeholder text="connecting…" />
                        )}
                        {tier === "small" && lastLog ? (
                            <Box paddingX={1}>
                                <Text wrap="truncate-end">
                                    {describeEvent(lastLog, state.names, state.you).map((part, i) => (
                                        <Text key={i} color={part.color} bold={part.bold}>
                                            {part.text}
                                        </Text>
                                    ))}
                                </Text>
                            </Box>
                        ) : null}
                    </Box>
                ) : null}
                {showSidebar ? (
                    <Sidebar
                        state={state}
                        width={sidebarWidth}
                        height={size.rows - (state.status === "reconnecting" ? 2 : 1)}
                        chatValue={chat}
                        onChatChange={setChat}
                        onChatSubmit={sendChat}
                        chatActive={focus === "chat"}
                    />
                ) : null}
            </Box>
            <Box paddingX={1} height={1}>
                {notice ? (
                    <Text color="red">{notice}</Text>
                ) : confirmLeave ? (
                    <Text color="yellow">leave the room? enter: leave · esc: stay</Text>
                ) : (
                    <Text color="gray">
                        {focus === "chat" ? "enter send · esc back" : "tab chat · esc leave"}
                    </Text>
                )}
            </Box>
        </Box>
    );
}

function Placeholder({text}: {text: string}) {
    return (
        <Box flexGrow={1} alignItems="center" justifyContent="center">
            <Text color="gray">{text}</Text>
        </Box>
    );
}

function Closed({reason}: {reason: string | null}) {
    const message =
        reason === "unreachable"
            ? "Could not reach the server. Is it running?"
            : reason === "lost"
              ? "Lost the connection to the server."
              : errorText(reason ?? "");
    return (
        <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center">
            <Text bold color="red">
                {message}
            </Text>
            <Text color="gray">press enter to go back</Text>
        </Box>
    );
}
