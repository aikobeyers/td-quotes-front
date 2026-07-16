import {
  Component,
  inject,
  output,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TdQuotesService } from '../../../services/td-quotes.service';
import { catchError, forkJoin, of, take } from 'rxjs';
import { SkeletonComponent } from '../../../components/skeleton/skeleton.component';
import { TdQuoteWithId } from '../../../models/TdQuote';
import { FiltersStore } from '../../../stores/filters.store';
import { TdQuoteAuthorWithId } from '../../../models/TdQuoteAuthor';

@Component({
  selector: 'app-td-quote-game',
  imports: [MatIcon, SkeletonComponent],
  templateUrl: './td-quote-game.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
  public gameStage = signal<'guesser' | 'leaderboard'>('guesser');
  public authors = this.store.authors;
  public topThree = computed(() => {
    return [...this.authors()].sort((a, b) => b.score - a.score).slice(0, 3);
  });
  public authorOptions = signal<TdQuoteAuthorWithId[]>([]);
  public selectedGuesserIds = signal<string[]>([]);
  public stepIndex = computed(() => {
    return this.gameStage() === 'guesser' ? 1 : 2;
  });
  public progressPercent = computed(() => {
    if (this.gameStage() === 'guesser') {
      return 0;
    }

    return 100;
  });
  public quoteAuthorName = computed(() => {
    return this.randomQuote()?.by?.name ?? 'Unknown';
  });

  public closeGameEmitter = output<void>();

  openGame(): void {
    this.setOpen(true);
    this.startNewRound();
  }

  public startNewRound(): void {
    this.isLoading.set(true);
    this.gameStage.set('guesser');
    this.selectedGuesserIds.set([]);
    this.authorOptions.set(this.shuffleAuthors(this.authors()));

    this.tdQuotesService
      .getRandomQuote()
      .pipe(take(1))
      .subscribe({
        next: (quote) => {
          this.isLoading.set(false);
          this.randomQuote.set(quote);
        },
        error: () => {
          this.isLoading.set(false);
          this.randomQuote.set(null);
        },
      });
  }

  selectAuthor(authorId: string): void {
    if (this.gameStage() !== 'guesser') {
      return;
    }

    this.selectedGuesserIds.update((selectedIds) => {
      if (selectedIds.includes(authorId)) {
        return selectedIds.filter((id) => id !== authorId);
      }

      return [...selectedIds, authorId];
    });
  }

  public isAuthorSelected(authorId: string): boolean {
    return this.selectedGuesserIds().includes(authorId);
  }

  public hasSelectedGuessers(): boolean {
    return this.selectedGuesserIds().length > 0;
  }

  public savePointsAndNewRound(): void {
    this.savePoints(() => this.startNewRound());
  }

  public savePointsAndViewLeaderboard(): void {
    this.savePoints(() => this.gameStage.set('leaderboard'));
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

  private shuffleAuthors(authors: TdQuoteAuthorWithId[]): TdQuoteAuthorWithId[] {
    const copy = [...authors];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const current = copy[index];
      copy[index] = copy[randomIndex];
      copy[randomIndex] = current;
    }

    return copy;
  }

  private savePoints(onSuccess: () => void): void {
    const guesserIds = this.selectedGuesserIds();
    if (guesserIds.length === 0 || this.isUpdatingScore()) {
      return;
    }

    this.isUpdatingScore.set(true);
    forkJoin(
      guesserIds.map((guesserId) =>
        this.tdQuotesService.updateAuthorScore(guesserId).pipe(
          take(1),
          catchError(() => of(null))
        )
      )
    )
      .pipe(take(1))
      .subscribe({
        next: (updatedAuthors) => {
          for (const updatedAuthor of updatedAuthors) {
            if (updatedAuthor) {
              this.store.updateAuthor(updatedAuthor);
            }
          }

          this.isUpdatingScore.set(false);
          onSuccess();
        },
        error: () => {
          this.isUpdatingScore.set(false);
        },
      });
  }
}
