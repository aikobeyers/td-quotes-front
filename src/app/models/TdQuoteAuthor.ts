export type TdQuoteAuthor = {
    name: string;
    score: number;
    favorites?: Array<{ _id: string }>;
}

export type TdQuoteAuthorWithId = TdQuoteAuthor & {
    _id: string;
}

