export type Color =  "red" | "yellow" | "green" | "blue";

type CardNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type NumberCard = {
    kind: "number";
    color: Color;
    value: CardNumber;
};

export type SkipCard = {
    kind: "skip";
    color: Color;
}

export type ReverseCard = {
    kind: "reverse";
    color: Color;
}

export type DrawTwoCard = {
    kind: "drawTwo";
    color: Color;
}

export type WildCard = {
    kind: "wild";
}

export type WildDrawFourCard = {
    kind: "wildDrawFour";
}

export type CardId = number

export type Card = {id: CardId} &  (NumberCard | SkipCard | ReverseCard | DrawTwoCard | WildCard | WildDrawFourCard);

