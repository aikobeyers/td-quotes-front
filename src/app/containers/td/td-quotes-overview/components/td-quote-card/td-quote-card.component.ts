import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TdQuoteWithId } from '../../../../../models/TdQuote';
import { SkeletonComponent } from '../../../../../components/skeleton/skeleton.component';

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

  public toggleFavorite(): void {
    const quoteId = this.tdQuote()?._id;
    if (quoteId) {
      this.favoriteToggled.emit(quoteId);
    }
  }
}
