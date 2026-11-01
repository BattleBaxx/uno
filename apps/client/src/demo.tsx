import {useState} from "react";
import {Box, render, Text, useApp, useInput} from "ink";
import {createDeck, type Card, type Color} from "@uno/engine";
import {cardBack, cardFace} from "./art/card";
import {layoutHand} from "./art/hand";
import {CARD_SIZES, tierFor, type CardSize} from "./art/size";
import {CanvasView} from "./ui/CanvasView";
import {TooSmall} from "./ui/TooSmall";
import {useTerminalSize} from "./ui/useTerminalSize";

const deck = createDeck();
const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const HAND = deck.filter((_, i) => i % 4 === 1).slice(0, 25);

const digits = Array.from({length: 10}, (_, value) =>
    deck.find((c) => c.kind === "number" && c.value === value && c.color === COLORS[value % 4]),
).filter((c): c is Card => c !== undefined);

const powerCards = (color: Color) =>
    (["skip", "reverse", "drawTwo"] as const)
        .map((kind) => deck.find((c) => c.kind === kind && c.color === color))
        .filter((c): c is Card => c !== undefined);

const wilds = deck.filter((c) => c.kind === "wild" || c.kind === "wildDrawFour").slice(0, 2);

function CardRow({cards, size, withBack = false}: {cards: Card[]; size: CardSize; withBack?: boolean}) {
    return (
        <Box flexDirection="row" gap={1}>
            {cards.map((card) => (
                <CanvasView key={card.id} canvas={cardFace(card, size)} />
            ))}
            {withBack ? <CanvasView canvas={cardBack(size)} /> : null}
        </Box>
    );
}

function Demo() {
    const {exit} = useApp();
    const size = useTerminalSize();
    const [selected, setSelected] = useState(12);

    useInput((input, key) => {
        if (input === "q" || key.escape) {
            exit();
        }
        if (key.leftArrow) {
            setSelected((s) => Math.max(0, s - 1));
        }
        if (key.rightArrow) {
            setSelected((s) => Math.min(HAND.length - 1, s + 1));
        }
    });

    const tier = tierFor(size.columns, size.rows);
    if (!tier) {
        return <TooSmall size={size} />;
    }

    const cardSize = CARD_SIZES[tier];
    const hand = layoutHand(HAND, selected, cardSize, size.columns - 16);

    return (
        <Box flexDirection="column" width={size.columns} height={size.rows} paddingX={1}>
            <Text>
                <Text bold color="yellow">UNO card art</Text>
                <Text color="gray">
                    {"  "}
                    {tier} tier · {size.columns}×{size.rows} · resize the window to see it adapt
                </Text>
            </Text>
            <Box flexDirection="column" marginTop={1}>
                <CardRow cards={digits} size={cardSize} />
                <CardRow cards={[...powerCards("red"), ...powerCards("yellow")]} size={cardSize} />
                <CardRow cards={[...powerCards("green"), ...powerCards("blue"), ...wilds]} size={cardSize} withBack />
            </Box>
            <Box flexGrow={1} />
            <Box flexDirection="row" alignItems="center" gap={2}>
                <Box width={6} justifyContent="flex-end">
                    <Text color="gray">{hand.hiddenLeft > 0 ? `‹ ${hand.hiddenLeft}` : ""}</Text>
                </Box>
                <CanvasView canvas={hand.canvas} />
                <Text color="gray">{hand.hiddenRight > 0 ? `${hand.hiddenRight} ›` : ""}</Text>
            </Box>
            <Text color="gray">
                card {selected + 1} of {HAND.length} · ←/→ select · q quit
            </Text>
        </Box>
    );
}

render(<Demo />, {alternateScreen: true, incrementalRendering: true});
