import {Box, Text} from "ink";
import {MIN_COLUMNS, MIN_ROWS} from "../art/size";
import type {TerminalSize} from "./useTerminalSize";

export function TooSmall({size}: {size: TerminalSize}) {
    return (
        <Box width={size.columns} height={size.rows} alignItems="center" justifyContent="center" flexDirection="column">
            <Text bold>Your terminal is too small</Text>
            <Text color="gray">
                It is {size.columns}×{size.rows}. Please make it at least {MIN_COLUMNS}×{MIN_ROWS}.
            </Text>
        </Box>
    );
}
