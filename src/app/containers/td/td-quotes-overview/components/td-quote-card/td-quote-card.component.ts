import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TdQuoteWithId } from '../../../../../models/TdQuote';
import { SkeletonComponent } from '../../../../../components/skeleton/skeleton.component';
import { TdQuoteAuthorWithId } from '../../../../../models/TdQuoteAuthor';

type ProfilePictureShape = {
  profilePictureUrl?: string;
  profilePictureDataUrl?: string;
  profilePictureBase64?: string;
  profilePictureContentType?: string;
};

@Component({
  selector: 'td-quote-card',
  imports: [SkeletonComponent],
  templateUrl: './td-quote-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './td-quote-card.component.scss',
})
export class TdQuoteCardComponent {
  public tdQuote = input<TdQuoteWithId>();
  public isSkeleton = input<boolean>(false);
  public isFavorite = input<boolean>(false);
  public favoriteToggled = output<string>();
  public editRequested = output<string>();
  public historyRequested = output<string>();
  private readonly authorImageLoadFailures = signal<Record<string, string>>({});
  public hasVersionHistory = computed(() => {
    const quote = this.tdQuote();
    if (!quote) {
      return false;
    }

    return Boolean(quote.hasVersionHistory);
  });
  public authorProfilePictureSrc = computed(() => {
    const author = this.tdQuote()?.by;
    const src = this.resolveAuthorProfilePictureSrc(author);
    const authorId = author?._id ?? '';

    if (!src || !authorId) {
      return null;
    }

    if (this.authorImageLoadFailures()[authorId] === src) {
      return null;
    }

    return src;
  });

  public toggleFavorite(): void {
    const quoteId = this.tdQuote()?._id;
    if (quoteId) {
      this.favoriteToggled.emit(quoteId);
    }
  }

  public requestEdit(): void {
    const quoteId = this.tdQuote()?._id;
    if (!quoteId) {
      return;
    }

    this.editRequested.emit(quoteId);
  }

  public requestHistory(): void {
    const quoteId = this.tdQuote()?._id;
    if (!quoteId) {
      return;
    }

    this.historyRequested.emit(quoteId);
  }

  public onAuthorProfilePictureError(authorId?: string, src?: string): void {
    if (!authorId || !src) {
      return;
    }

    this.authorImageLoadFailures.update((failures) => ({
      ...failures,
      [authorId]: src,
    }));
  }

  private resolveAuthorProfilePictureSrc(author?: TdQuoteAuthorWithId): string | null {
    if (!author) {
      return null;
    }

    const pictureCandidate = author as TdQuoteAuthorWithId & ProfilePictureShape;

    if (this.hasValue(pictureCandidate.profilePictureDataUrl)) {
      return pictureCandidate.profilePictureDataUrl;
    }

    if (this.hasValue(pictureCandidate.profilePictureUrl)) {
      return pictureCandidate.profilePictureUrl;
    }

    if (this.hasValue(pictureCandidate.profilePictureBase64)) {
      const contentType = this.hasValue(pictureCandidate.profilePictureContentType)
        ? pictureCandidate.profilePictureContentType
        : 'image/jpeg';

      return `data:${contentType};base64,${pictureCandidate.profilePictureBase64}`;
    }

    return null;
  }

  private hasValue(value?: string): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
