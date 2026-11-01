import {useState} from "react";
import {Box, Text, useInput} from "ink";
import {Logo} from "../ui/Logo";
import {DEFAULT_HAND_SIZE, MAX_HAND_SIZE, MIN_HAND_SIZE} from "@uno/engine";

type Props = {
    onCreate: (handSize: number) => Promise<void>;
    onBack: () => void;
};

export function Create({onCreate, onBack}: Props) {
    const [handSize, setHandSize] = useState(DEFAULT_HAND_SIZE);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useInput(
        (_, key) => {
            if (key.leftArrow) {
                setHandSize((n) => Math.max(MIN_HAND_SIZE, n - 1));
            }
            if (key.rightArrow) {
                setHandSize((n) => Math.min(MAX_HAND_SIZE, n + 1));
            }
            if (key.escape) {
                onBack();
            }
            if (key.return) {
                setBusy(true);
                setError(null);
                onCreate(handSize).catch((e: unknown) => {
                    setBusy(false);
                    setError(e instanceof Error ? e.message : "could not reach the server");
                });
            }
        },
        {isActive: !busy},
    );

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <Logo />
            <Box marginTop={2}>
                <Text bold color="yellow">
                    create a room
                </Text>
            </Box>
            <Box marginTop={1}>
                <Text>cards per hand </Text>
                <Text color="gray">{handSize > MIN_HAND_SIZE ? "‹ " : "  "}</Text>
                <Text bold>{String(handSize).padStart(2)}</Text>
                <Text color="gray">{handSize < MAX_HAND_SIZE ? " ›" : "  "}</Text>
            </Box>
            <Box marginTop={1} height={1}>
                {busy ? <Text color="gray">creating…</Text> : <Text color="red">{error ?? ""}</Text>}
            </Box>
            <Text color="gray">←/→ change · enter create · esc back</Text>
        </Box>
    );
}
