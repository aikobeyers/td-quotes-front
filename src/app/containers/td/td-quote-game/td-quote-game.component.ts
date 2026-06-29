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
import { take } from 'rxjs';
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
  public gameStage = signal<'quote' | 'authors' | 'feedback' | 'guesser' | 'leaderboard'>('quote');
  public authors = this.store.authors;
  public topThree = computed(() => {
    return [...this.authors()].sort((a, b) => b.score - a.score).slice(0, 3);
  });
  public authorOptions = signal<TdQuoteAuthorWithId[]>([]);
  public selectedAuthorId = signal<string | null>(null);
  public selectedGuesserId = signal<string | null>(null);
  public feedbackType = signal<'correct' | 'incorrect' | null>(null);
  public feedbackMessage = signal('');
  public stepIndex = computed(() => {
    const stage = this.gameStage();

    if (stage === 'quote') {
      return 1;
    }

    if (stage === 'authors' || stage === 'feedback') {
      return 2;
    }

    if (stage === 'guesser') {
      return 3;
    }

    return 4;
  });
  public progressPercent = computed(() => {
    const totalSteps = 4;
    return (this.stepIndex() / totalSteps) * 100;
  });
  public correctAuthorName = computed(() => {
    return this.randomQuote()?.by?.name ?? 'Unknown';
  });

  public closeGameEmitter = output<void>();

  openGame(): void {
    this.setOpen(true);
    this.startNewRound();
  }

  public startNewRound(): void {
    this.isLoading.set(true);
    this.gameStage.set('quote');
    this.feedbackType.set(null);
    this.feedbackMessage.set('');
    this.selectedAuthorId.set(null);
    this.selectedGuesserId.set(null);
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

  showAuthors(): void {
    if (!this.randomQuote()) {
      return;
    }

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
      const selectedAuthorId = this.selectedAuthorId();

      if (!selectedAuthorId) {
        return;
      }

      const isCorrect = selectedAuthorId === correctAuthorId;
      this.feedbackType.set(isCorrect ? 'correct' : 'incorrect');
      this.feedbackMessage.set(
        isCorrect
          ? `Nice. This quote was by ${this.correctAuthorName()}.`
          : `Not quite. Try again.`
      );
      this.gameStage.set('feedback');

      if (!isCorrect) {
        this.selectedAuthorId.set(null);
      }
      return;
    }

    if (this.gameStage() === 'guesser') {
      const guesserId = this.selectedGuesserId();
      if (!guesserId) {
        return;
      }
      this.isUpdatingScore.set(true);
      this.tdQuotesService
        .updateAuthorScore(guesserId)
        .pipe(take(1))
        .subscribe({
          next: (updatedAuthor) => {
            this.store.updateAuthor(updatedAuthor);
            this.gameStage.set('leaderboard');
            this.isUpdatingScore.set(false);
          },
          error: () => {
            this.isUpdatingScore.set(false);
          },
        });
    }
  }

  public continueFromFeedback(): void {
    if (this.feedbackType() !== 'correct') {
      this.gameStage.set('authors');
      return;
    }

    this.gameStage.set('guesser');
    this.selectedGuesserId.set(null);
  }

  public isAuthorSelected(authorId: string): boolean {
    if (this.gameStage() === 'authors') {
      return this.selectedAuthorId() === authorId;
    }

    return this.selectedGuesserId() === authorId;
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
}
