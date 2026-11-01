import {useState} from "react";
import {Box, Text, useInput} from "ink";
import {Logo} from "../ui/Logo";
import {ROOM_KEY_ALPHABET, ROOM_KEY_LENGTH} from "@uno/protocol";
import {TextInput} from "../ui/TextInput";

type Props = {
    onJoin: (roomKey: string) => void;
    onBack: () => void;
};

export function Join({onJoin, onBack}: Props) {
    const [key, setKey] = useState("");

    useInput((_, k) => {
        if (k.escape) {
            onBack();
        }
    });

    const accept = (ch: string) => {
        const upper = ch.toUpperCase();
        return ROOM_KEY_ALPHABET.includes(upper) ? upper : null;
    };

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <Logo />
            <Box marginTop={2}>
                <Text bold color="yellow">
                    join a room
                </Text>
            </Box>
            <Box marginTop={1}>
                <TextInput
                    prefix="room key  "
                    value={key}
                    onChange={setKey}
                    onSubmit={(value) => value.length === ROOM_KEY_LENGTH && onJoin(value)}
                    active
                    maxLength={ROOM_KEY_LENGTH}
                    placeholder="ask the host for it"
                    accept={accept}
                />
            </Box>
            <Box marginTop={1} height={1}>
                <Text color="gray">{key.length === ROOM_KEY_LENGTH ? "press enter to join" : ""}</Text>
            </Box>
            <Text color="gray">type the 6-character key · enter join · esc back</Text>
        </Box>
    );
}
