export type TdQuoteAuthor = {
    name: string;
    score: number;
    favorites?: Array<{ _id: string }>;
    hasProfilePicture?: boolean;
    profilePictureUrl?: string;
    profilePictureDataUrl?: string;
    profilePictureBase64?: string;
    profilePictureContentType?: string;
}

export type TdQuoteAuthorWithId = TdQuoteAuthor & {
    _id: string;
}

