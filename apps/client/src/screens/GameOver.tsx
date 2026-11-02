import {Box, Text} from "ink";
import type {FinishedView} from "@uno/protocol";
import {Logo} from "../ui/Logo";

export function GameOver({view, showLogo}: {view: FinishedView; showLogo: boolean}) {
    const youWon = view.winner === view.you;
    const winner = view.names[view.winner] ?? "someone";

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            {showLogo ? (
                <Box marginBottom={2}>
                    <Logo />
                </Box>
            ) : null}
            <Text bold color="yellow">
                {youWon ? "you won!" : `${winner} won the game`}
            </Text>
            <Box marginTop={1}>
                <Text color="gray">the room closes in 10 minutes · press enter to go back</Text>
            </Box>
        </Box>
    );
}
