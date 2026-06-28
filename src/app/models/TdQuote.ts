import { TdQuoteAuthorWithId } from "./TdQuoteAuthor";

export type TdQuote = {
    by: TdQuoteAuthorWithId;
    value: string;
    date: string;
}

export type TdQuoteWithId = TdQuote & {
    _id: string;
}