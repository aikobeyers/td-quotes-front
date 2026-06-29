import {
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
  computed,
  ElementRef,
  HostListener,
} from '@angular/core';
import { TdQuotesService } from '../../../services/td-quotes.service';
import { PushNotificationsService } from '../../../services/push-notifications.service';
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
import { TdQuoteAuthorWithId } from '../../../models/TdQuoteAuthor';
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

  @ViewChild('headerActions')
  private headerActionsElement?: ElementRef<HTMLElement>;

  private readonly tdQuotesService = inject(TdQuotesService);
  private readonly pushNotificationsService = inject(PushNotificationsService);
  private readonly titleService = inject(Title);
  private readonly store = inject(FiltersStore);
  private readonly secretTapThresholdMs = 200;
  private readonly secretTapTarget = 5;
  private readonly syntheticClickWindowMs = 500;
  private brandTapCount = 0;
  private lastBrandTapTime = 0;
  private lastTouchTapTime = 0;
  public authors = this.store.authors;

  public quotes = this.store.quotes;
  private readonly activeUserStorageKey = 'td_quotes_active_user';

  public isLoading = signal(false);
  public hasScrolled = signal(false);
  public isActiveUserModalOpen = signal(false);
  public isSavingActiveUser = signal(false);
  public activeUserSaveError = signal('');
  public isHeaderMenuOpen = signal(false);
  public isSecretModalOpen = signal(false);
  public isSendingSecretNotification = signal(false);
  public activeUser = signal<{ id: string; name: string } | null>(
    this.loadActiveUser()
  );
  public selectedActiveUserId = signal('');
  public newActiveUserName = '';
  public appliedFilters = signal(this.takeAppliedFiltersSnapshot());
  public secretNotificationTitle = '';
  public secretNotificationBody = '';
  public secretNotificationAudience = signal<'all' | 'selected'>('all');
  public secretRecipientAuthorIds = signal<string[]>([]);
  public activeAuthor = computed(() => {
    const activeUser = this.activeUser();
    if (!activeUser) {
      return null;
    }

    return this.authors().find((author) => author._id === activeUser.id) ?? null;
  });
  public favoriteQuoteIds = computed(() => {
    const favorites = this.activeAuthor()?.favorites ?? [];
    return new Set(favorites.map((favorite) => favorite._id));
  });
  public displayedQuotes = computed(() => {
    return this.quotes();
  });
  public activeFilterPills = computed(() => {
    const filters = this.appliedFilters();
    const pills: string[] = [this.formatScopeLabel(filters.scope)];

    if (filters.quoteQuery.trim().length > 0) {
      pills.push(`Search: ${filters.quoteQuery.trim()}`);
    }

    for (const author of filters.by) {
      pills.push(`By: ${author}`);
    }

    return pills;
  });
  public targetableRecipientAuthors = computed(() => {
    return this.authors().filter((author) => this.isObjectId(author._id));
  });

  public ngOnInit(): void {
    this.titleService.setTitle('TD Quotes');
    this.tdQuotesService
      .getAuthors()
      .pipe(take(1))
      .subscribe({
        next: (authors) => {
          this.store.setAuthors(authors);
          this.openActiveUserModalIfNeeded();
        },
        error: () => {
          this.openActiveUserModalIfNeeded();
        },
      });
    this.getQuotes();
  }

  public selectActiveUser(author: TdQuoteAuthorWithId): void {
    this.selectedActiveUserId.set(author._id);
    this.newActiveUserName = '';
  }

  public onNewActiveUserInput(name: string): void {
    this.newActiveUserName = name;
    this.activeUserSaveError.set('');

    if (name.trim().length > 0) {
      this.selectedActiveUserId.set('');
    }
  }

  public canConfirmActiveUser(): boolean {
    return (
      this.selectedActiveUserId().trim().length > 0 ||
      this.newActiveUserName.trim().length > 0
    );
  }

  public confirmActiveUser(): void {
    if (this.isSavingActiveUser()) {
      return;
    }

    const existingUserId = this.selectedActiveUserId().trim();
    const customUserName = this.newActiveUserName.trim();
    this.activeUserSaveError.set('');

    let resolvedUser: { id: string; name: string } | null = null;

    if (existingUserId) {
      const existingUser = this.authors().find((author) => author._id === existingUserId);
      if (existingUser) {
        resolvedUser = {
          id: existingUser._id,
          name: existingUser.name,
        };
      }
    } else if (customUserName) {
      const existingAuthorWithSameName = this.authors().find(
        (author) => author.name.trim().toLowerCase() === customUserName.toLowerCase()
      );

      if (existingAuthorWithSameName) {
        resolvedUser = {
          id: existingAuthorWithSameName._id,
          name: existingAuthorWithSameName.name,
        };
      } else {
        this.isSavingActiveUser.set(true);
        this.tdQuotesService
          .createAuthor(customUserName)
          .pipe(take(1))
          .subscribe({
            next: (createdAuthor) => {
              const authorExists = this.authors().some(
                (author) => author._id === createdAuthor._id
              );

              if (!authorExists) {
                this.store.addAuthor(createdAuthor);
              }

              this.finalizeActiveUserSelection({
                id: createdAuthor._id,
                name: createdAuthor.name,
              });
              this.isSavingActiveUser.set(false);
            },
            error: () => {
              this.isSavingActiveUser.set(false);
              this.activeUserSaveError.set('Could not save user right now. Please try again.');
            },
          });
        return;
      }
    }

    if (!resolvedUser) {
      return;
    }

    this.finalizeActiveUserSelection(resolvedUser);
  }

  public onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.hasScrolled.set(target.scrollTop > 0);
  }

  public openFilters(): void {
    this.closeHeaderMenu();
    this.filtersComponent.openFilters();
  }

  public toggleHeaderMenu(): void {
    this.isHeaderMenuOpen.update((isOpen) => !isOpen);
  }

  public closeHeaderMenu(): void {
    this.isHeaderMenuOpen.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  public onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isHeaderMenuOpen()) {
      return;
    }

    const actionsElement = this.headerActionsElement?.nativeElement;
    const target = event.target as Node | null;
    if (!actionsElement || !target) {
      return;
    }

    if (!actionsElement.contains(target)) {
      this.closeHeaderMenu();
    }
  }

  public openGameFromMenu(): void {
    this.closeHeaderMenu();
    this.openGame();
  }

  public openLeaderboardFromMenu(): void {
    this.closeHeaderMenu();
    this.openLeaderboard();
  }

  public logoutActiveUser(): void {
    this.closeHeaderMenu();
    this.activeUser.set(null);
    this.clearCookie(this.activeUserStorageKey);
    this.pushNotificationsService.syncSubscriptionWithActiveUser();
    this.openActiveUserModalIfNeeded();
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
    this.secretNotificationAudience.set('all');
    this.secretRecipientAuthorIds.set([]);
    this.isSecretModalOpen.set(true);
  }

  public closeSecretModal(): void {
    this.isSecretModalOpen.set(false);
    this.isSendingSecretNotification.set(false);
  }

  public canSendSecretNotification(): boolean {
    if (
      this.secretNotificationAudience() === 'selected' &&
      this.secretRecipientAuthorIds().length === 0
    ) {
      return false;
    }

    return (
      this.secretNotificationTitle.trim().length > 0 &&
      this.secretNotificationBody.trim().length > 0
    );
  }

  public setSecretNotificationAudience(audience: 'all' | 'selected'): void {
    this.secretNotificationAudience.set(audience);
    if (audience === 'all') {
      this.secretRecipientAuthorIds.set([]);
    }
  }

  public isSecretRecipientSelected(authorId: string): boolean {
    return this.secretRecipientAuthorIds().includes(authorId);
  }

  public toggleSecretRecipient(authorId: string): void {
    if (!this.isObjectId(authorId)) {
      return;
    }

    this.secretRecipientAuthorIds.update((ids) => {
      if (ids.includes(authorId)) {
        return ids.filter((id) => id !== authorId);
      }

      return [...ids, authorId];
    });
  }

  public sendSecretNotification(): void {
    if (!this.canSendSecretNotification() || this.isSendingSecretNotification()) {
      return;
    }

    this.isSendingSecretNotification.set(true);
    const recipientAuthorIds = this.secretNotificationAudience() === 'selected'
      ? this.secretRecipientAuthorIds()
      : undefined;

    this.tdQuotesService
      .sendNewQuotePushNotification(
        this.secretNotificationTitle.trim(),
        this.secretNotificationBody.trim(),
        recipientAuthorIds
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
    this.closeHeaderMenu();
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
      this.appliedFilters.set(this.takeAppliedFiltersSnapshot());
      this.isLoading.set(true);
      this.tdQuotesService
        .getTdQuotes()
        .pipe(take(1))
        .subscribe({
          next: (quotes) => {
            this.store.setQuotes(quotes);
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          },
        });
    }
  }

  public isFavorite(quoteId: string): boolean {
    return this.favoriteQuoteIds().has(quoteId);
  }

  public toggleFavorite(quoteId: string): void {
    const activeUser = this.activeUser();
    if (!activeUser || !this.isObjectId(activeUser.id)) {
      return;
    }

    const request$ = this.isFavorite(quoteId)
      ? this.tdQuotesService.removeFavoriteQuote(activeUser.id, quoteId)
      : this.tdQuotesService.addFavoriteQuote(activeUser.id, quoteId);

    request$.pipe(take(1)).subscribe({
      next: (updatedAuthor) => {
        this.store.updateAuthor(updatedAuthor);

        if (this.store.filters().scope === 'favorites') {
          this.getQuotes();
        }
      },
      error: () => {
        // No-op so UI remains responsive when favorite mutation fails.
      },
    });
  }

  private openActiveUserModalIfNeeded(): void {
    if (this.activeUser()) {
      return;
    }

    this.isSavingActiveUser.set(false);
    this.activeUserSaveError.set('');
    this.selectedActiveUserId.set('');
    this.newActiveUserName = '';
    this.isActiveUserModalOpen.set(true);
  }

  private finalizeActiveUserSelection(user: { id: string; name: string }): void {
    this.activeUser.set(user);
    this.persistActiveUser(user);
    this.pushNotificationsService.syncSubscriptionWithActiveUser();
    this.isActiveUserModalOpen.set(false);
    this.selectedActiveUserId.set('');
    this.newActiveUserName = '';
    this.activeUserSaveError.set('');
  }

  private loadActiveUser(): { id: string; name: string } | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const storedValue = this.readCookie(this.activeUserStorageKey);
    if (!storedValue) {
      return null;
    }

    try {
      const parsedValue = JSON.parse(storedValue) as {
        id?: unknown;
        name?: unknown;
      };

      if (
        typeof parsedValue.id === 'string' &&
        parsedValue.id.trim().length > 0 &&
        typeof parsedValue.name === 'string' &&
        parsedValue.name.trim().length > 0
      ) {
        return {
          id: parsedValue.id,
          name: parsedValue.name,
        };
      }
    } catch {
      // Fall through and try legacy string cookie format.
    }

    const legacyName = storedValue.trim();
    if (!legacyName) {
      return null;
    }

    return {
      id: `legacy-${legacyName.toLowerCase().replace(/\s+/g, '-')}`,
      name: legacyName,
    };
  }

  private persistActiveUser(user: { id: string; name: string }): void {
    if (typeof document === 'undefined') {
      return;
    }

    const encodedValue = encodeURIComponent(JSON.stringify(user));
    const maxAgeSeconds = 60 * 60 * 24 * 365;
    document.cookie = `${this.activeUserStorageKey}=${encodedValue}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
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

  private clearCookie(name: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  }

  private isObjectId(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value.trim());
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
      });
  }

  private takeAppliedFiltersSnapshot(): {
    by: string[];
    quoteQuery: string;
    scope: 'all' | 'recent' | 'favorites';
  } {
    const filters = this.store.filters();
    return {
      by: [...filters.by],
      quoteQuery: filters.quoteQuery,
      scope: filters.scope,
    };
  }

  private formatScopeLabel(scope: 'all' | 'recent' | 'favorites'): string {
    return scope.charAt(0).toUpperCase() + scope.slice(1);
  }
}
