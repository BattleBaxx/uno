import {useState} from "react";
import {Box, Text, useInput} from "ink";
import {CHAT_MAX_LENGTH} from "@uno/protocol";
import {describeEntry, type Part} from "../game/log";
import type {ClientState} from "../game/store";
import {scroll, scrollWindow, wrapParts} from "../game/wrap";
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

const INPUT_HEIGHT = 2;
const PANEL_CHROME = 3;
const SIDE_CHROME = 4;

export function Sidebar({state, width, height, chatValue, onChatChange, onChatSubmit, chatActive}: Props) {
    const [logAnchor, setLogAnchor] = useState<number | null>(null);
    const [chatAnchor, setChatAnchor] = useState<number | null>(null);

    const logHeight = Math.max(4, Math.floor((height - INPUT_HEIGHT) * 0.55));
    const chatHeight = Math.max(4, height - INPUT_HEIGHT - logHeight);
    const textWidth = Math.max(1, width - SIDE_CHROME);
    const logRows = Math.max(1, logHeight - PANEL_CHROME);
    const chatRows = Math.max(1, chatHeight - PANEL_CHROME + 1);

    const name = (id: string) => (id === state.you ? "you" : (state.names[id] ?? "someone"));
    const logLines = state.log.flatMap((entry) => wrapParts(describeEntry(entry, state.names, state.you), textWidth));
    const chatLines = state.chat.flatMap((line) =>
        wrapParts(
            [{text: `${name(line.from)}:`, bold: true, color: line.from === state.you ? "yellow" : undefined}, {text: ` ${line.text}`}],
            textWidth,
        ),
    );

    useInput((_, key) => {
        if (key.pageUp) {
            setLogAnchor((a) => scroll(a, -logRows, logLines.length, logRows));
        } else if (key.pageDown) {
            setLogAnchor((a) => scroll(a, logRows, logLines.length, logRows));
        } else if (chatActive && key.upArrow) {
            setChatAnchor((a) => scroll(a, -1, chatLines.length, chatRows));
        } else if (chatActive && key.downArrow) {
            setChatAnchor((a) => scroll(a, 1, chatLines.length, chatRows));
        }
    });

    return (
        <Box flexDirection="column" width={width} height={height} overflow="hidden">
            <ScrollPanel title="LOG" lines={logLines} rows={logRows} anchor={logAnchor} height={logHeight} active={false} />
            <ScrollPanel
                title="CHAT"
                lines={chatLines}
                rows={chatRows}
                anchor={chatAnchor}
                height={chatHeight}
                active={chatActive}
                footer
            />
            <Box paddingX={1} borderStyle="round" borderColor={chatActive ? "yellow" : "gray"} borderTop={false}>
                <TextInput
                    prefix="> "
                    value={chatValue}
                    onChange={onChatChange}
                    onSubmit={(value) => {
                        setChatAnchor(null);
                        onChatSubmit(value);
                    }}
                    active={chatActive}
                    maxLength={CHAT_MAX_LENGTH}
                    placeholder={chatActive ? "say something or type uno" : "tab to chat"}
                />
            </Box>
        </Box>
    );
}

function ScrollPanel({
    title,
    lines,
    rows,
    anchor,
    height,
    active,
    footer = false,
}: {
    title: string;
    lines: Part[][];
    rows: number;
    anchor: number | null;
    height: number;
    active: boolean;
    footer?: boolean;
}) {
    const window = scrollWindow(lines, rows, anchor);
    const padding = Math.max(0, rows - window.visible.length);
    const hint = window.newerHidden > 0 ? `↓ ${window.newerHidden} newer` : window.olderHidden > 0 ? "↑ older" : "";

    return (
        <Box
            flexDirection="column"
            height={height}
            borderStyle="round"
            borderColor={active ? "yellow" : "gray"}
            borderBottom={!footer}
            paddingX={1}
        >
            <Box justifyContent="space-between">
                <Text bold color={active ? "yellow" : "gray"}>
                    {title}
                </Text>
                <Text color={window.newerHidden > 0 ? "yellow" : "gray"}>{hint}</Text>
            </Box>
            {Array.from({length: padding}, (_, i) => (
                <Text key={`pad-${i}`}> </Text>
            ))}
            {window.visible.map((line, i) => (
                <Text key={i} wrap="truncate-end">
                    {line.map((part, j) => (
                        <Text key={j} color={part.color} bold={part.bold}>
                            {part.text}
                        </Text>
                    ))}
                </Text>
            ))}
        </Box>
    );
}
