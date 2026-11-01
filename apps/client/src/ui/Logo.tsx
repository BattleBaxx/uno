import {useEffect, useState} from "react";
import {Box, Text} from "ink";
import {RAINBOW} from "../art/card";
import {LOGO} from "../art/logo";
import type {Paint} from "../art/canvas";

const BAND_WIDTH = 8;
const TICK_MS = 160;

export function shimmerColor(x: number, y: number, tick: number): Paint {
    const band = Math.floor((x + y - tick + 10_000 * BAND_WIDTH) / BAND_WIDTH);
    return RAINBOW[band % RAINBOW.length] ?? "white";
}

export function Logo() {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), TICK_MS);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box flexDirection="column">
            {LOGO.map((line, y) => (
                <Text key={y} bold>
                    {runs(line, y, tick).map((run, i) => (
                        <Text key={i} color={run.color}>
                            {run.text}
                        </Text>
                    ))}
                </Text>
            ))}
        </Box>
    );
}

function runs(line: string, y: number, tick: number): {text: string; color: Paint}[] {
    const result: {text: string; color: Paint}[] = [];
    Array.from(line).forEach((ch, x) => {
        const color = shimmerColor(x, y, tick);
        const last = result.at(-1);
        if (last && last.color === color) {
            last.text += ch;
        } else {
            result.push({text: ch, color});
        }
    });
    return result;
}
