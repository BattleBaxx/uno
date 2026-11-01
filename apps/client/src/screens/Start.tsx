import {useState} from "react";
import {Box, Text, useInput} from "ink";
import {NAME_MAX_LENGTH} from "@uno/protocol";
import type {Session} from "../net/session";
import {Logo} from "../ui/Logo";
import {TextInput} from "../ui/TextInput";

type Choice = "create" | "join" | "resume" | "quit";

type Props = {
    name: string;
    onName: (name: string) => void;
    saved: Session | null;
    onChoose: (choice: Choice) => void;
};

const NAME_PREFIX = "name  ";
const FIELD_WIDTH = NAME_PREFIX.length + NAME_MAX_LENGTH + 1;

export function Start({name, onName, saved, onChoose}: Props) {
    const choices: Choice[] = saved ? ["resume", "create", "join", "quit"] : ["create", "join", "quit"];
    const [focus, setFocus] = useState<"name" | "menu">("name");
    const [selected, setSelected] = useState(0);
    const [hint, setHint] = useState<string | null>(null);
    const hasName = name.trim() !== "";

    const needName = () => {
        setFocus("name");
        setHint("type your name first");
    };

    useInput((_, key) => {
        if (key.escape) {
            onChoose("quit");
            return;
        }
        if (focus === "name") {
            if (key.downArrow) {
                setFocus("menu");
            }
            return;
        }
        if (key.upArrow) {
            if (selected === 0) {
                setFocus("name");
            } else {
                setSelected((s) => s - 1);
            }
        }
        if (key.downArrow) {
            setSelected((s) => Math.min(choices.length - 1, s + 1));
        }
        if (key.return) {
            const choice = choices[selected] ?? "quit";
            if (choice !== "quit" && !hasName) {
                needName();
                return;
            }
            onChoose(choice);
        }
    });

    const label = (choice: Choice) => {
        switch (choice) {
            case "resume":
                return `resume room ${saved?.roomKey ?? ""}`;
            case "create":
                return "create a room";
            case "join":
                return "join a room";
            case "quit":
                return "quit";
        }
    };

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <Logo />
            <Box marginTop={2} width={FIELD_WIDTH + 2}>
                <Text color={focus === "name" ? "yellow" : undefined}>{focus === "name" ? "▶ " : "  "}</Text>
                <TextInput
                    prefix={NAME_PREFIX}
                    value={name}
                    onChange={(value) => {
                        setHint(null);
                        onName(value);
                    }}
                    onSubmit={() => (hasName ? setFocus("menu") : needName())}
                    active={focus === "name"}
                    maxLength={NAME_MAX_LENGTH}
                    placeholder="your name"
                    width={FIELD_WIDTH}
                />
            </Box>
            <Box flexDirection="column" marginTop={1} width={FIELD_WIDTH + 2}>
                {choices.map((choice, i) => {
                    const current = focus === "menu" && i === selected;
                    return (
                        <Text key={choice} color={current ? "yellow" : undefined} bold={current}>
                            {current ? "▶ " : "  "}
                            {label(choice)}
                        </Text>
                    );
                })}
            </Box>
            <Box marginTop={1} height={1}>
                <Text color="red">{hint ?? ""}</Text>
            </Box>
            <Text color="gray">
                {focus === "name" ? "type your name · ↓ or enter: menu · esc quit" : "↑/↓ choose · enter select · esc quit"}
            </Text>
        </Box>
    );
}
