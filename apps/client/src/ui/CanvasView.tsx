import {Box, Text} from "ink";
import {toRuns, type Canvas} from "../art/canvas";

export function CanvasView({canvas}: {canvas: Canvas}) {
    return (
        <Box flexDirection="column">
            {canvas.map((row, y) => (
                <Text key={y} wrap="truncate-end">
                    {toRuns(row).map((run, i) => (
                        <Text
                            key={i}
                            color={run.color ?? undefined}
                            backgroundColor={run.bg ?? undefined}
                            bold={run.bold}
                            underline={run.underline}
                        >
                            {run.text}
                        </Text>
                    ))}
                </Text>
            ))}
        </Box>
    );
}
