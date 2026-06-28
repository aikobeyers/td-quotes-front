import { Component, inject, output, OnDestroy, signal, computed } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TdQuotesService } from '../../../services/td-quotes.service';
import { take } from 'rxjs';
import { SkeletonComponent } from "../../../components/skeleton/skeleton.component";
import { TdQuoteWithId } from '../../../models/TdQuote';
import { FiltersStore } from '../../../stores/filters.store';

@Component({
  selector: 'app-td-quote-game',
  imports: [NgClass, MatIcon, SkeletonComponent],
  templateUrl: './td-quote-game.component.html',
  styleUrl: './td-quote-game.component.scss',
})
export class TdQuoteGameComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly tdQuotesService = inject(TdQuotesService);
  private readonly store = inject(FiltersStore);

  public isOpen = false;
  public isLoading = signal(false);
  public isUpdatingScore = signal(false);

  public randomQuote = signal<TdQuoteWithId | null>(null);
  public gameStage = signal<'quote' | 'authors' | 'correct' | 'incorrect' | 'guesser' | 'leaderboard'>('quote');
  public authors = this.store.authors;
  public topThree = computed(() => {
    return [...this.authors()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  });
  public selectedAuthorId = signal<string | null>(null);
  public selectedGuesserId = signal<string | null>(null);

  public closeGameEmitter = output<void>();

  openGame(): void {
    this.isLoading.set(true);
    this.gameStage.set('quote');
    this.setOpen(true);

    this.tdQuotesService.getRandomQuote()
      .pipe(take(1))
      .subscribe((quote) => {
        this.isLoading.set(false);
        this.randomQuote.set(quote);
      });
  }

  showAuthors(): void {
    this.gameStage.set('authors');
    this.selectedAuthorId.set(null);
    this.selectedGuesserId.set(null);
  }

  selectAuthor(authorId: string): void {
    if (this.gameStage() === 'authors') {
      this.selectedAuthorId.set(authorId);
    }

    if (this.gameStage() === 'guesser') {
      this.selectedGuesserId.set(authorId);
    }
  }

  submitSelection(): void {
    if (this.gameStage() === 'authors') {
      const correctAuthorId = this.randomQuote()?.by?._id;
      if (this.selectedAuthorId() && this.selectedAuthorId() === correctAuthorId) {
        this.gameStage.set('correct');
        setTimeout(() => {
          this.gameStage.set('guesser');
          this.selectedGuesserId.set(null);
        }, 1500);
      } else if (this.selectedAuthorId()) {
        this.gameStage.set('incorrect');
        setTimeout(() => {
          this.gameStage.set('authors');
          this.selectedAuthorId.set(null);
        }, 1500);
      }
      return;
    }

    if (this.gameStage() === 'guesser') {
      const guesserId = this.selectedGuesserId();
      if (!guesserId) {
        return;
      }
      this.isUpdatingScore.set(true);
      this.tdQuotesService.updateAuthorScore(guesserId).pipe(take(1)).subscribe((updatedAuthor) => {
        this.store.updateAuthor(updatedAuthor);
        setTimeout(() => {
          this.gameStage.set('leaderboard');
          this.isUpdatingScore.set(false);
        }, 300);
      });
    }
  }

  closeGame(): void {
    this.setOpen(false);
    this.closeGameEmitter.emit();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('game--open');
  }

  private setOpen(isOpen: boolean): void {
    this.isOpen = isOpen;
    this.document.body.classList.toggle('game--open', isOpen);
  }
}
