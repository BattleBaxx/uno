import {Box, Text} from "ink";
import {CHAT_MAX_LENGTH} from "@uno/protocol";
import {describeEvent, type LogLine} from "../game/log";
import type {ClientState} from "../game/store";
import {TextInput} from "./TextInput";

type Props = {
    state: ClientState;
    width: number;
    height: number;
    chatValue: string;
    onChatChange: (value: string) => void;
    onChatSubmit: (value: string) => void;
    chatActive: boolean;
};

export function Sidebar({state, width, height, chatValue, onChatChange, onChatSubmit, chatActive}: Props) {
    const inputHeight = 2;
    const logHeight = Math.max(4, Math.floor((height - inputHeight) * 0.55));
    const chatHeight = Math.max(4, height - inputHeight - logHeight);
    const name = (id: string) => (id === state.you ? "you" : (state.names[id] ?? "someone"));

    return (
        <Box flexDirection="column" width={width} height={height} overflow="hidden">
            <Panel title="LOG" height={logHeight} active={false}>
                {state.log.map((event, i) => (
                    <Line key={i} line={describeEvent(event, state.names, state.you)} />
                ))}
            </Panel>
            <Panel title="CHAT" height={chatHeight} active={chatActive} footer>
                {state.chat.map((line, i) => (
                    <Text key={i} wrap="wrap">
                        <Text bold color={line.from === state.you ? "yellow" : undefined}>
                            {name(line.from)}:
                        </Text>{" "}
                        {line.text}
                    </Text>
                ))}
            </Panel>
            <Box paddingX={1} borderStyle="round" borderColor={chatActive ? "yellow" : "gray"} borderTop={false}>
                <TextInput
                    prefix="> "
                    value={chatValue}
                    onChange={onChatChange}
                    onSubmit={onChatSubmit}
                    active={chatActive}
                    maxLength={CHAT_MAX_LENGTH}
                    placeholder={chatActive ? "say something or type uno" : "tab to chat"}
                />
            </Box>
        </Box>
    );
}

function Panel({
    title,
    height,
    active,
    footer = false,
    children,
}: {
    title: string;
    height: number;
    active: boolean;
    footer?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Box
            flexDirection="column"
            height={height}
            borderStyle="round"
            borderColor={active ? "yellow" : "gray"}
            borderBottom={!footer}
            paddingX={1}
        >
            <Text bold color={active ? "yellow" : "gray"}>
                {title}
            </Text>
            <Box flexDirection="column" justifyContent="flex-end" overflow="hidden" flexGrow={1}>
                {children}
            </Box>
        </Box>
    );
}

function Line({line}: {line: LogLine}) {
    return (
        <Text wrap="wrap">
            {line.map((part, i) => (
                <Text key={i} color={part.color} bold={part.bold}>
                    {part.text}
                </Text>
            ))}
        </Text>
    );
}
