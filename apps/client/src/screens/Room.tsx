import {useEffect, useRef, useState} from "react";
import {Box, Text, useInput} from "ink";
import type {ClientMessage} from "@uno/protocol";
import type {Tier} from "../art/size";
import {describeEntry, errorText} from "../game/log";
import type {ClientState} from "../game/store";
import {Sidebar} from "../ui/Sidebar";
import type {TerminalSize} from "../ui/useTerminalSize";
import {useNow} from "../ui/useNow";
import {GameOver} from "./GameOver";
import {Lobby} from "./Lobby";
import {PICKER_COLORS, Table} from "./Table";

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
    const [selectedCard, setSelectedCard] = useState(0);
    const [picking, setPicking] = useState<number | null>(null);
    const view = state.view;
    const hand = view?.phase === "playing" ? view.hand : [];
    const selected = Math.min(selectedCard, Math.max(0, hand.length - 1));
    const handBeforeDraw = useRef<number | null>(null);

    useEffect(() => {
        if (handBeforeDraw.current !== null && hand.length > handBeforeDraw.current) {
            setSelectedCard(hand.length - 1);
        }
        handBeforeDraw.current = null;
    }, [hand.length, state.notice]);
    const counting = state.view?.phase === "lobby" && state.view.startsAt !== null;
    const showingNotice = state.notice !== null && Date.now() - state.notice.at < NOTICE_MS;
    const now = useNow(counting || showingNotice ? 250 : null);

    useInput((input, key) => {
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
        if (picking !== null) {
            const card = hand[selected];
            if (key.leftArrow) {
                setPicking((p) => ((p ?? 0) + PICKER_COLORS.length - 1) % PICKER_COLORS.length);
            } else if (key.rightArrow) {
                setPicking((p) => ((p ?? 0) + 1) % PICKER_COLORS.length);
            } else if (key.return && card) {
                send({type: "play", cardId: card.id, color: PICKER_COLORS[picking]});
                setPicking(null);
            } else if (key.escape) {
                setPicking(null);
            }
            return;
        }
        if (key.escape) {
            setConfirmLeave(true);
            return;
        }
        if (view?.phase === "lobby") {
            if (key.return && view.host === state.you) {
                send({type: "start"});
            }
            return;
        }
        if (view?.phase === "finished") {
            if (key.return) {
                onLeave();
            }
            return;
        }
        if (view?.phase === "playing") {
            if (key.leftArrow) {
                setSelectedCard(Math.max(0, selected - 1));
            } else if (key.rightArrow) {
                setSelectedCard(Math.min(hand.length - 1, selected + 1));
            } else if (key.return) {
                const card = hand[selected];
                if (card?.kind === "wild" || card?.kind === "wildDrawFour") {
                    setPicking(0);
                } else if (card) {
                    send({type: "play", cardId: card.id});
                }
            } else if (input === "d") {
                handBeforeDraw.current = hand.length;
                send({type: "draw"});
            } else if (input === "p") {
                send({type: "pass"});
            }
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
    const banner = state.status === "reconnecting" ? 1 : 0;
    const mainWidth = tier === "small" ? size.columns : size.columns - sidebarWidth;
    const mainHeight = size.rows - 1 - banner - (tier === "small" && lastLog ? 1 : 0);
    const help = helpText(state, focus, picking !== null);

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
                            <Table
                                view={state.view}
                                tier={tier}
                                width={mainWidth}
                                height={mainHeight}
                                selected={selected}
                                picking={picking}
                                offline={state.offline}
                            />
                        ) : state.view?.phase === "finished" ? (
                            <GameOver view={state.view} showLogo={tier !== "small"} />
                        ) : (
                            <Placeholder text="connecting…" />
                        )}
                        {tier === "small" && lastLog ? (
                            <Box paddingX={1}>
                                <Text wrap="truncate-end">
                                    {describeEntry(lastLog, state.names, state.you).map((part, i) => (
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
                    <Text color="gray">{help}</Text>
                )}
            </Box>
        </Box>
    );
}

function helpText(state: ClientState, focus: "main" | "chat", picking: boolean): string {
    if (focus === "chat") {
        return "enter send · type uno to call UNO · esc back";
    }
    if (picking) {
        return "←/→ choose a color · enter play · esc cancel";
    }
    const view = state.view;
    if (view?.phase === "finished") {
        return "enter back to start";
    }
    if (view?.phase !== "playing") {
        return "tab chat · esc leave";
    }
    if (view.currentPlayer !== view.you) {
        return "←/→ look at your cards · tab chat · esc leave";
    }
    if (view.pendingDraw > 0) {
        return `stack a card with enter, or d to draw ${view.pendingDraw} · tab chat`;
    }
    if (view.hasDrawn) {
        return "←/→ select · enter play · p pass · tab chat";
    }
    return "←/→ select · enter play · d draw · tab chat";
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
