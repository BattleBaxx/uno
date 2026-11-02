import {Box, Text} from "ink";
import type {Color, PlayerId} from "@uno/engine";
import type {PlayingView} from "@uno/protocol";
import {cardFace} from "../art/card";
import {layoutHand} from "../art/hand";
import {CARD_SIZES, type CardSize, type Tier} from "../art/size";
import {backStack, drawPile, seatsFor, stackWidth, type Seat} from "../art/table";
import {CanvasView} from "../ui/CanvasView";

export const PICKER_COLORS: Color[] = ["red", "yellow", "green", "blue"];

type Props = {
    view: PlayingView;
    tier: Tier;
    width: number;
    height: number;
    selected: number;
    picking: number | null;
    offline: PlayerId[];
};

export function Table({view, tier, width, height, selected, picking, offline}: Props) {
    const size = CARD_SIZES[tier];
    const seats = seatsFor(
        view.players.map((p) => p.id),
        view.you,
    );
    const sideWidth = Math.max(stackWidth(size) + 2, Math.floor(width * 0.22));
    const hand = layoutHand(view.hand, selected, size, Math.max(size.width, width - 14));

    const seat = (position: Seat) => {
        const id = seats[position];
        if (!id) {
            return null;
        }
        const player = view.players.find((p) => p.id === id);
        return (
            <SeatView
                name={view.names[id] ?? "someone"}
                count={player?.cardCount ?? null}
                active={view.currentPlayer === id}
                online={!offline.includes(id)}
                size={size}
            />
        );
    };

    return (
        <Box flexDirection="column" width={width} height={height} overflow="hidden">
            <Box justifyContent="center" minHeight={seats.top ? size.height + 1 : 0}>
                {seat("top")}
            </Box>
            <Box flexDirection="row" flexGrow={1} alignItems="center">
                <Box width={sideWidth} justifyContent="center">
                    {seat("left")}
                </Box>
                <Box flexGrow={1} justifyContent="center">
                    <Center view={view} size={size} />
                </Box>
                <Box width={sideWidth} justifyContent="center">
                    {seat("right")}
                </Box>
            </Box>
            {picking !== null ? <ColorPicker selected={picking} /> : null}
            <Box flexDirection="row" justifyContent="center" alignItems="center">
                <Box width={6} justifyContent="flex-end">
                    <Text color="gray">{hand.hiddenLeft > 0 ? `‹ ${hand.hiddenLeft}` : ""}</Text>
                </Box>
                <Box marginX={1}>
                    <CanvasView canvas={hand.canvas} />
                </Box>
                <Box width={6}>
                    <Text color="gray">{hand.hiddenRight > 0 ? `${hand.hiddenRight} ›` : ""}</Text>
                </Box>
            </Box>
        </Box>
    );
}

function SeatView({
    name,
    count,
    active,
    online,
    size,
}: {
    name: string;
    count: number | null;
    active: boolean;
    online: boolean;
    size: CardSize;
}) {
    const label = count === null ? "many cards" : count === 1 ? "1 card" : `${count} cards`;
    return (
        <Box flexDirection="column" alignItems="center">
            <Text wrap="truncate-end">
                <Text bold color={active ? "yellow" : undefined} inverse={active}>
                    {` ${name} `}
                </Text>
                <Text color={online ? "green" : "gray"}>{online ? " ●" : " ○"}</Text>
            </Text>
            <CanvasView canvas={backStack(count, size)} />
            <Text color="gray">{label}</Text>
        </Box>
    );
}

function Center({view, size}: {view: PlayingView; size: CardSize}) {
    const yourTurn = view.currentPlayer === view.you;
    const turnName = yourTurn ? "your" : `${view.names[view.currentPlayer] ?? "someone"}'s`;

    return (
        <Box flexDirection="column" alignItems="center">
            <Text bold color={yourTurn ? "yellow" : undefined}>
                {turnName} turn
            </Text>
            <Box flexDirection="row" gap={4} marginTop={1}>
                <Box flexDirection="column" alignItems="center">
                    <CanvasView canvas={cardFace(view.topCard, size)} />
                    <Text>
                        <Text color="gray">color </Text>
                        <Text backgroundColor={view.currentColor}>{"  "}</Text>
                        <Text bold color={view.currentColor}>
                            {" " + view.currentColor.toUpperCase()}
                        </Text>
                    </Text>
                </Box>
                <Box flexDirection="column" alignItems="center">
                    <CanvasView canvas={drawPile(view.drawPileCount, size)} />
                    <Text color="gray">draw · {view.drawPileCount}</Text>
                </Box>
            </Box>
            <Box marginTop={1} height={1}>
                {view.pendingDraw > 0 ? (
                    <Text bold color="red">
                        +{view.pendingDraw} pending
                    </Text>
                ) : (
                    <Text color="gray">{view.direction === 1 ? "clockwise" : "counter-clockwise"}</Text>
                )}
            </Box>
        </Box>
    );
}

function ColorPicker({selected}: {selected: number}) {
    return (
        <Box justifyContent="center" marginBottom={1}>
            <Text color="gray">choose a color </Text>
            {PICKER_COLORS.map((color, i) => (
                <Text key={color}>
                    {" "}
                    <Text backgroundColor={i === selected ? color : undefined} color={i === selected ? "black" : color} bold>
                        {` ${color} `}
                    </Text>
                </Text>
            ))}
        </Box>
    );
}
