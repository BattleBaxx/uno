import {Text, useInput} from "ink";

const PRINTABLE = /^[^\p{Cc}\p{Cf}]$/u;

type Props = {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
    active: boolean;
    maxLength: number;
    placeholder?: string;
    prefix?: string;
    width?: number;
    accept?: (ch: string) => string | null;
};

export function TextInput({
    value,
    onChange,
    onSubmit,
    active,
    maxLength,
    placeholder = "",
    prefix = "",
    width,
    accept,
}: Props) {
    useInput(
        (input, key) => {
            if (key.return) {
                onSubmit?.(value);
                return;
            }
            if (key.backspace || key.delete) {
                onChange(value.slice(0, -1));
                return;
            }
            if (key.ctrl || key.meta || key.tab || key.escape || key.upArrow || key.downArrow) {
                return;
            }
            if (key.leftArrow || key.rightArrow) {
                return;
            }
            const typed = Array.from(input)
                .map((ch) => (accept ? accept(ch) : ch))
                .filter((ch): ch is string => ch !== null && PRINTABLE.test(ch))
                .join("");
            if (typed) {
                onChange((value + typed).slice(0, maxLength));
            }
        },
        {isActive: active},
    );

    const cursor = active ? 1 : 0;
    const used = prefix.length + (value === "" ? placeholder.length : value.length) + cursor;
    const padding = width === undefined ? "" : " ".repeat(Math.max(0, width - used));

    return (
        <Text wrap="truncate-start">
            <Text color="gray">{prefix}</Text>
            {value === "" ? (
                <>
                    {active ? <Text inverse> </Text> : null}
                    <Text color="gray">{placeholder}</Text>
                </>
            ) : (
                <>
                    {value}
                    {active ? <Text inverse> </Text> : null}
                </>
            )}
            {padding}
        </Text>
    );
}
