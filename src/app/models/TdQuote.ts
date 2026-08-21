import { TdQuoteAuthorWithId } from "./TdQuoteAuthor";

export type TdQuoteHistoryRecord = {
    _id: string;
    quote: string;
    value: string;
    date: string;
    by: TdQuoteAuthorWithId;
    changedBy: TdQuoteAuthorWithId;
    changedAt: string;
}

export type TdQuote = {
    by: TdQuoteAuthorWithId;
    createdBy?: TdQuoteAuthorWithId | null;
    value: string;
    date: string;
    hasVersionHistory?: boolean;
}

export type TdQuoteWithId = TdQuote & {
    _id: string;
}

export type TdQuoteHistoryResponse = {
    quoteId: string;
    hasVersionHistory: boolean;
    history: TdQuoteHistoryRecord[];
}