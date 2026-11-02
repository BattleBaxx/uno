import type {Part} from "./log";

export function wrapParts(parts: Part[], width: number): Part[][] {
    const limit = Math.max(1, width);
    const lines: Part[][] = [[]];
    let used = 0;

    const push = (text: string, style: Omit<Part, "text">) => {
        const line = lines.at(-1)!;
        const last = line.at(-1);
        if (last && last.color === style.color && last.bold === style.bold) {
            last.text += text;
        } else {
            line.push({...style, text});
        }
        used += text.length;
    };

    const newLine = () => {
        const line = lines.at(-1)!;
        const last = line.at(-1);
        if (last) {
            last.text = last.text.trimEnd();
        }
        lines.push([]);
        used = 0;
    };

    for (const {text, ...style} of parts) {
        for (const token of text.split(/(\s+)/)) {
            if (token === "") {
                continue;
            }
            const isSpace = /^\s+$/.test(token);
            if (isSpace) {
                if (used > 0 && used + token.length <= limit) {
                    push(token, style);
                } else if (used > 0) {
                    newLine();
                }
                continue;
            }
            if (used + token.length > limit && used > 0) {
                newLine();
            }
            let rest = token;
            while (rest.length > limit - used) {
                const room = limit - used;
                push(rest.slice(0, room), style);
                rest = rest.slice(room);
                newLine();
            }
            if (rest) {
                push(rest, style);
            }
        }
    }

    return lines;
}

export type ScrollWindow<T> = {visible: T[]; newerHidden: number; olderHidden: number};

export function scrollWindow<T>(lines: T[], height: number, anchor: number | null): ScrollWindow<T> {
    const rows = Math.max(1, height);
    const lastIndex = lines.length - 1;
    const end = anchor === null ? lastIndex : Math.min(lastIndex, Math.max(anchor, rows - 1));
    const start = Math.max(0, end - rows + 1);
    return {
        visible: lines.slice(start, end + 1),
        newerHidden: Math.max(0, lastIndex - end),
        olderHidden: start,
    };
}

export function scroll(anchor: number | null, by: number, total: number, height: number): number | null {
    const lastIndex = total - 1;
    const current = anchor ?? lastIndex;
    const next = Math.min(lastIndex, Math.max(Math.min(lastIndex, height - 1), current + by));
    return next >= lastIndex ? null : next;
}
