export type TdQuoteAuthor = {
    name: string;
    score: number;
}

export type TdQuoteAuthorWithId = TdQuoteAuthor & {
    _id: string;
}

