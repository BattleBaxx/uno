import {useEffect, useRef, useState, type RefObject} from "react";
import {Box, measureElement, Text, type DOMElement} from "ink";
import type {Card, Color, PlayerId} from "@uno/engine";
import type {PlayingView} from "@uno/protocol";
import {cardFace} from "../art/card";
import {layoutHand} from "../art/hand";
import {CARD_SIZES, type CardSize, type Tier} from "../art/size";
import {backStack, drawPile, seatsFor, stackWidth, type Seat} from "../art/table";
import {isSliding, slidePosition, slideProgress, type Point, type Slide} from "../game/slide";
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
    slide: Slide | null;
    now: number;
};

export function Table({view, tier, width, height, selected, picking, offline, slide, now}: Props) {
    const size = CARD_SIZES[tier];
    const seats = seatsFor(
        view.players.map((p) => p.id),
        view.you,
    );
    const sideWidth = Math.max(stackWidth(size) + 2, Math.floor(width * 0.22));
    const hand = layoutHand(view.hand, selected, size, Math.max(size.width, width - 14));

    const rootRef = useRef<DOMElement>(null);
    const handRef = useRef<DOMElement>(null);
    const pileRef = useRef<DOMElement>(null);
    const seatRefs = {top: useRef<DOMElement>(null), left: useRef<DOMElement>(null), right: useRef<DOMElement>(null)};
    const [path, setPath] = useState<{from: Point; to: Point; startedAt: number} | null>(null);
    const sliding = isSliding(slide, now);

    useEffect(() => {
        if (!slide) {
            setPath(null);
            return;
        }
        const seat = (Object.keys(seats) as Seat[]).find((position) => seats[position] === slide.playerId);
        const source = slide.playerId === view.you ? handRef : seat ? seatRefs[seat] : null;
        const from = source ? cardSpot(source, rootRef, size) : null;
        const to = cardSpot(pileRef, rootRef, size);
        setPath(from && to ? {from, to, startedAt: slide.startedAt} : null);
    }, [slide?.startedAt]);

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
        <Box ref={rootRef} flexDirection="column" width={width} height={height} overflow="hidden">
            <Box justifyContent="center" minHeight={seats.top ? size.height + 1 : 0}>
                <Box ref={seatRefs.top}>{seat("top")}</Box>
            </Box>
            <Box flexDirection="row" flexGrow={1} alignItems="center">
                <Box width={sideWidth} justifyContent="center">
                    <Box ref={seatRefs.left}>{seat("left")}</Box>
                </Box>
                <Box flexGrow={1} justifyContent="center">
                    <Center
                        view={view}
                        size={size}
                        topCard={sliding ? slide.under : view.topCard}
                        pileRef={pileRef}
                    />
                </Box>
                <Box width={sideWidth} justifyContent="center">
                    <Box ref={seatRefs.right}>{seat("right")}</Box>
                </Box>
            </Box>
            {picking !== null ? <ColorPicker selected={picking} /> : null}
            <Box flexDirection="row" justifyContent="center" alignItems="center">
                <Box width={6} justifyContent="flex-end">
                    <Text color="gray">{hand.hiddenLeft > 0 ? `‹ ${hand.hiddenLeft}` : ""}</Text>
                </Box>
                <Box marginX={1} ref={handRef}>
                    <CanvasView canvas={hand.canvas} />
                </Box>
                <Box width={6}>
                    <Text color="gray">{hand.hiddenRight > 0 ? `${hand.hiddenRight} ›` : ""}</Text>
                </Box>
            </Box>
            {sliding && path?.startedAt === slide.startedAt ? (
                <Box position="absolute" {...toOffsets(slidePosition(path.from, path.to, slideProgress(slide, now)))}>
                    <CanvasView canvas={cardFace(slide.card, size)} />
                </Box>
            ) : null}
        </Box>
    );
}

function cardSpot(target: RefObject<DOMElement | null>, root: RefObject<DOMElement | null>, size: CardSize): Point | null {
    if (!target.current || !root.current) {
        return null;
    }
    const box = measureElement(target.current);
    const origin = measureElement(root.current);
    return {
        x: box.x - origin.x + Math.floor((box.width - size.width) / 2),
        y: box.y - origin.y + Math.floor((box.height - size.height) / 2),
    };
}

function toOffsets(point: Point): {left: number; top: number} {
    return {left: point.x, top: point.y};
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

function Center({
    view,
    size,
    topCard,
    pileRef,
}: {
    view: PlayingView;
    size: CardSize;
    topCard: Card;
    pileRef: RefObject<DOMElement | null>;
}) {
    const yourTurn = view.currentPlayer === view.you;
    const turnName = yourTurn ? "your" : `${view.names[view.currentPlayer] ?? "someone"}'s`;

    return (
        <Box flexDirection="column" alignItems="center">
            <Text bold color={yourTurn ? "yellow" : undefined}>
                {turnName} turn
            </Text>
            <Box flexDirection="row" gap={4} marginTop={1}>
                <Box flexDirection="column" alignItems="center">
                    <Box ref={pileRef}>
                        <CanvasView canvas={cardFace(topCard, size)} />
                    </Box>
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
