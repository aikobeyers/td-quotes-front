import {
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { TdQuotesService } from '../../../services/td-quotes.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TdQuoteCardComponent } from './components/td-quote-card/td-quote-card.component';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { FiltersStore } from '../../../stores/filters.store';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TdQuoteFiltersComponent } from '../td-quote-filters/td-quote-filters.component';
import { take } from 'rxjs';
import { TdQuoteCreateComponent } from '../td-quote-create/td-quote-create.component';
import { TdQuoteWithId } from '../../../models/TdQuote';
import { TdQuoteGameComponent } from '../td-quote-game/td-quote-game.component';
import { TdQuotesLeaderboardComponent } from '../td-quotes-leaderboard/td-quotes-leaderboard.component';

@Component({
  selector: 'app-td-quotes-overview',
  providers: [Title],
  imports: [
    TdQuoteCardComponent,
    CommonModule,
    MatIcon,
    TdQuoteFiltersComponent,
    TdQuoteCreateComponent,
    TdQuoteGameComponent,
    TdQuotesLeaderboardComponent,
    FormsModule,
  ],
  templateUrl: './td-quotes-overview.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './td-quotes-overview.component.scss',
})
export class TdQuotesOverviewComponent implements OnInit {
  @ViewChild('filters')
  private filtersComponent!: TdQuoteFiltersComponent;

  @ViewChild('create')
  private createComponent!: TdQuoteCreateComponent;

  @ViewChild('game')
  private gameComponent!: TdQuoteGameComponent;

  @ViewChild('leaderboard')
  private leaderboardComponent!: TdQuotesLeaderboardComponent;

  @ViewChild('container')
  private containerElement: any;

  private readonly tdQuotesService = inject(TdQuotesService);
  private readonly titleService = inject(Title);
  private readonly store = inject(FiltersStore);
  private readonly secretTapThresholdMs = 200;
  private readonly secretTapTarget = 5;
  private readonly syntheticClickWindowMs = 500;
  private brandTapCount = 0;
  private lastBrandTapTime = 0;
  private lastTouchTapTime = 0;

  public quotes = this.store.quotes;
  private readonly favoriteStorageKey = 'td_quotes_favorites';

  public isLoading = signal(false);
  public hasScrolled = signal(false);
  public isSecretModalOpen = signal(false);
  public isSendingSecretNotification = signal(false);
  public activeTab = signal<'all' | 'recent' | 'favorites'>('all');
  public favoriteQuoteIds = signal<string[]>(this.loadFavorites());
  public recentQuotes = signal<TdQuoteWithId[]>([]);
  public secretNotificationTitle = '';
  public secretNotificationBody = '';
  public displayedQuotes = computed(() => {
    const quoteList = this.quotes();
    const tab = this.activeTab();

    if (tab === 'favorites') {
      const favorites = new Set(this.favoriteQuoteIds());
      return quoteList.filter((quote) => favorites.has(quote._id));
    }

    if (tab === 'recent') {
      return this.recentQuotes();
    }

    return quoteList;
  });

  public ngOnInit(): void {
    this.titleService.setTitle('TD Quotes');
    this.tdQuotesService
      .getAuthors()
      .pipe(take(1))
      .subscribe((authors) => {
        this.store.setAuthors(authors);
      });
    this.getQuotes();
  }

  public onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.hasScrolled.set(target.scrollTop > 0);
  }

  public openFilters(): void {
    this.filtersComponent.openFilters();
  }

  public onBrandTap(event: Event): void {
    const eventType = event.type;
    const now = Date.now();

    if (eventType === 'touchstart') {
      this.lastTouchTapTime = now;
      event.preventDefault();
    }

    if (
      eventType === 'click' &&
      now - this.lastTouchTapTime <= this.syntheticClickWindowMs
    ) {
      return;
    }

    if (now - this.lastBrandTapTime <= this.secretTapThresholdMs) {
      this.brandTapCount += 1;
    } else {
      this.brandTapCount = 1;
    }

    this.lastBrandTapTime = now;

    if (this.brandTapCount >= this.secretTapTarget) {
      this.brandTapCount = 0;
      this.openSecretModal();
    }
  }

  public openSecretModal(): void {
    this.secretNotificationTitle = '';
    this.secretNotificationBody = '';
    this.isSecretModalOpen.set(true);
  }

  public closeSecretModal(): void {
    this.isSecretModalOpen.set(false);
    this.isSendingSecretNotification.set(false);
  }

  public canSendSecretNotification(): boolean {
    return (
      this.secretNotificationTitle.trim().length > 0 &&
      this.secretNotificationBody.trim().length > 0
    );
  }

  public sendSecretNotification(): void {
    if (!this.canSendSecretNotification() || this.isSendingSecretNotification()) {
      return;
    }

    this.isSendingSecretNotification.set(true);
    this.tdQuotesService
      .sendNewQuotePushNotification(
        this.secretNotificationTitle.trim(),
        this.secretNotificationBody.trim()
      )
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.closeSecretModal();
        },
        error: () => {
          this.isSendingSecretNotification.set(false);
        },
      });
  }

  public openCreate(): void {
    this.createComponent.openCreate();
  }

  public openGame(): void {
    this.gameComponent.openGame();
  }

  public openLeaderboard(): void {
    this.leaderboardComponent.openLeaderboard();
  }

  public getQuotes(skip = false): void {
    if (!skip) {
      this.isLoading.set(true);
      this.tdQuotesService
        .getTdQuotes()
        .pipe(take(1))
        .subscribe((quotes) => {
          this.store.setQuotes(quotes);
          this.isLoading.set(false);
        });
    }
  }

  public setActiveTab(tab: 'all' | 'recent' | 'favorites'): void {
    this.activeTab.set(tab);

    if (tab === 'recent') {
      this.getRecentQuotes();
    }
  }

  private getRecentQuotes(): void {
    this.isLoading.set(true);
    this.tdQuotesService
      .getRecentTdQuotes()
      .pipe(take(1))
      .subscribe({
        next: (quotes) => {
          this.recentQuotes.set(quotes);
          this.isLoading.set(false);
        },
        error: () => {
          this.recentQuotes.set([]);
          this.isLoading.set(false);
        },
      });
  }

  public isFavorite(quoteId: string): boolean {
    return this.favoriteQuoteIds().includes(quoteId);
  }

  public toggleFavorite(quoteId: string): void {
    const currentFavorites = this.favoriteQuoteIds();
    const favorites = currentFavorites.includes(quoteId)
      ? currentFavorites.filter((id) => id !== quoteId)
      : [...currentFavorites, quoteId];

    this.favoriteQuoteIds.set(favorites);
    this.persistFavorites(favorites);
  }

  private loadFavorites(): string[] {
    if (typeof document === 'undefined') {
      return [];
    }

    const storedValue = this.readCookie(this.favoriteStorageKey);
    if (!storedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(storedValue);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  private persistFavorites(favorites: string[]): void {
    if (typeof document === 'undefined') {
      return;
    }

    const encodedValue = encodeURIComponent(JSON.stringify(favorites));
    const maxAgeSeconds = 60 * 60 * 24 * 365;
    document.cookie = `${this.favoriteStorageKey}=${encodedValue}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
  }

  private readCookie(name: string): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const prefix = `${name}=`;
    const parts = document.cookie.split(';');

    for (const part of parts) {
      const cookie = part.trim();
      if (cookie.startsWith(prefix)) {
        const value = cookie.slice(prefix.length);
        return decodeURIComponent(value);
      }
    }

    return null;
  }

  public createQuote(quoteData: {
    value: string;
    date: string;
    by: string | undefined | null;
    newAuthor: string | undefined | null;
  }): void {
    this.tdQuotesService
      .createQuote(quoteData)
      .pipe(take(1))
      .subscribe((res: TdQuoteWithId) => {
        this.store.addQuote(res);
        if (res.by && quoteData.newAuthor) {
          this.store.addAuthor(res.by);
        }

        this.tdQuotesService
          .sendNewQuotePushNotification(
            'Very important notification',
            'Someone added a new quote!'
          )
          .pipe(take(1))
          .subscribe({
            error: () => {
              // No-op so quote creation never fails due to notification issues.
            },
          });

        if (this.activeTab() === 'recent') {
          this.getRecentQuotes();
        }
      });
  }
}
