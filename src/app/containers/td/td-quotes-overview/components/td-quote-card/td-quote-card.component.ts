import { Component, effect, input } from '@angular/core';
import { TdQuoteWithId } from '../../../../../models/TdQuote';
import { SkeletonComponent } from "../../../../../components/skeleton/skeleton.component";

@Component({
  selector: 'td-quote-card',
  imports: [SkeletonComponent],
  templateUrl: './td-quote-card.component.html',
  styleUrl: './td-quote-card.component.scss'
})
export class TdQuoteCardComponent {
  public tdQuote = input<TdQuoteWithId>();
  public isSkeleton = input<boolean>(false);

  constructor() {
  }

}
