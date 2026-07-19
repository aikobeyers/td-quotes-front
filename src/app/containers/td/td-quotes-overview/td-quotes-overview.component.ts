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
import { ActivatedRoute, Router } from '@angular/router';
import { FiltersStore, QuoteSort } from '../../../stores/filters.store';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TdQuoteFiltersComponent } from '../td-quote-filters/td-quote-filters.component';
import { take } from 'rxjs';
import { TdQuoteCreateComponent } from '../td-quote-create/td-quote-create.component';
import { TdQuoteWithId } from '../../../models/TdQuote';
import { TdQuoteAuthorWithId } from '../../../models/TdQuoteAuthor';
import { TdQuoteGameComponent } from '../td-quote-game/td-quote-game.component';
import { TdQuotesLeaderboardComponent } from '../td-quotes-leaderboard/td-quotes-leaderboard.component';
import { PwaInstallService } from '../../../services/pwa-install';
import { TdActiveUserModalComponent } from './components/active-user-modal/td-active-user-modal.component';
import { TdSecretModalComponent } from './components/secret-modal/td-secret-modal.component';

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
    TdActiveUserModalComponent,
    TdSecretModalComponent,
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

  @ViewChild('quickFabCluster')
  private quickFabClusterElement?: ElementRef<HTMLElement>;

  private readonly pwaInstallService = inject(PwaInstallService);

  readonly canInstall = this.pwaInstallService.canInstall;

  private readonly tdQuotesService = inject(TdQuotesService);
  private readonly pushNotificationsService = inject(PushNotificationsService);
  private readonly titleService = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(FiltersStore);
  private readonly secretTapThresholdMs = 200;
  private readonly secretTapTarget = 5;
  private readonly syntheticClickWindowMs = 500;
  private readonly filtersToggleDeltaPx = 10;
  private readonly maxProfilePictureBytes = 1024 * 1024;
  private lastOverviewScrollTop = 0;
  private selectedProfilePictureFile = signal<File | null>(null);
  private readonly profilePictureRequestsInFlight = new Set<string>();
  private readonly profilePictureDataUrlsByAuthorId = signal<Record<string, string>>({});
  private brandTapCount = 0;
  private lastBrandTapTime = 0;
  private lastTouchTapTime = 0;
  public authors = this.store.authors;

  public quotes = this.store.quotes;
  private readonly activeUserStorageKey = 'td_quotes_active_user';

  public isLoading = signal(false);
  public hasScrolled = signal(false);
  public isFiltersRowVisible = signal(true);
  public isActiveUserModalOpen = signal(false);
  public isSavingActiveUser = signal(false);
  public activeUserSaveError = signal('');
  public isHeaderMenuOpen = signal(false);
  public isQuickFabOpen = signal(false);
  public isSecretModalOpen = signal(false);
  public isSendingSecretNotification = signal(false);
  public sortMode = this.store.sort;
  public randomOrderRank = signal<Record<string, number>>({});
  public activeUser = signal<{ id: string; name: string } | null>(
    this.loadActiveUser()
  );
  public selectedActiveUserId = signal('');
  public newActiveUserName = '';
  public appliedFilters = signal(this.takeAppliedFiltersSnapshot());
  public notifTitles = [
    'Very important notification',
    'Surprise',
    'Important message',
    'Incoming communication',
  ];
  public notifBodies = [
    'Someone added a new quote!',
    'Check out the latest quote!',
    'If you don\'t check out the new quote you\'re lame!',
    'You\'ve got a new quote to read!',
  ];
  public secretNotificationTitle = '';
  public secretNotificationBody = '';
  public secretModalTab = signal<'notification' | 'user' | 'picture'>('notification');
  public secretNotificationAudience = signal<'all' | 'selected'>('all');
  public secretRecipientAuthorIds = signal<string[]>([]);
  public selectedProfilePictureAuthorId = signal('');
  public selectedProfilePictureFileName = signal('');
  public profilePictureResetToken = signal(0);
  public profilePictureUploadError = signal('');
  public isUploadingProfilePicture = signal(false);
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
    const quotes = [...this.quotes()];
    const mode = this.sortMode();
    const scope = this.appliedFilters().scope;

    if (scope === 'favorites' && mode === 'random') {
      return quotes;
    }

    if (scope === 'recent' && mode === 'random') {
      return quotes.sort((quoteA, quoteB) => {
        const parsedDateA = this.parseDateForSort(quoteA.date);
        const parsedDateB = this.parseDateForSort(quoteB.date);

        if (parsedDateA.isValid !== parsedDateB.isValid) {
          return parsedDateA.isValid ? -1 : 1;
        }

        if (!parsedDateA.isValid && !parsedDateB.isValid) {
          return quoteA.value.localeCompare(quoteB.value);
        }

        if (parsedDateA.timestamp !== parsedDateB.timestamp) {
          return parsedDateB.timestamp - parsedDateA.timestamp;
        }

        return quoteA.value.localeCompare(quoteB.value);
      });
    }

    if (mode === 'asc') {
      return quotes.sort((quoteA, quoteB) => {
        const parsedDateA = this.parseDateForSort(quoteA.date);
        const parsedDateB = this.parseDateForSort(quoteB.date);

        if (parsedDateA.isValid !== parsedDateB.isValid) {
          return parsedDateA.isValid ? -1 : 1;
        }

        if (!parsedDateA.isValid && !parsedDateB.isValid) {
          return quoteA.value.localeCompare(quoteB.value);
        }

        if (parsedDateA.timestamp !== parsedDateB.timestamp) {
          return parsedDateA.timestamp - parsedDateB.timestamp;
        }

        return quoteA.value.localeCompare(quoteB.value);
      });
    }

    if (mode === 'desc') {
      return quotes.sort((quoteA, quoteB) => {
        const parsedDateA = this.parseDateForSort(quoteA.date);
        const parsedDateB = this.parseDateForSort(quoteB.date);

        if (parsedDateA.isValid !== parsedDateB.isValid) {
          return parsedDateA.isValid ? -1 : 1;
        }

        if (!parsedDateA.isValid && !parsedDateB.isValid) {
          return quoteA.value.localeCompare(quoteB.value);
        }

        if (parsedDateA.timestamp !== parsedDateB.timestamp) {
          return parsedDateB.timestamp - parsedDateA.timestamp;
        }

        return quoteA.value.localeCompare(quoteB.value);
      });
    }

    const rank = this.randomOrderRank();
    return quotes.sort((quoteA, quoteB) => {
      const rankA = rank[quoteA._id] ?? Number.MAX_SAFE_INTEGER;
      const rankB = rank[quoteB._id] ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
  });
  public sortModeIcon = computed(() => {
    const scope = this.appliedFilters().scope;
    const mode = this.sortMode();

    if (scope === 'favorites' && mode === 'random') {
      return 'sort';
    }

    if (scope === 'recent' && mode === 'random') {
      return 'south';
    }

    if (mode === 'asc') {
      return 'north';
    }

    if (mode === 'desc') {
      return 'south';
    }

    if (mode === 'random') {
      return 'shuffle';
    }

    return 'sort';
  });

  public sortModeLabel = computed(() => {
    const scope = this.appliedFilters().scope;
    const mode = this.sortMode();

    if (scope === 'favorites' && mode === 'random') {
      return 'Sort: standard';
    }

    if (scope === 'recent' && mode === 'random') {
      return 'Sort: descending';
    }

    if (mode === 'asc') {
      return 'Sort: ascending';
    }

    if (mode === 'desc') {
      return 'Sort: descending';
    }

    if (mode === 'random') {
      return 'Sort: random';
    }

    return 'Sort: standard';
  });
  public isSortButtonActive = computed(() => {
    const scope = this.appliedFilters().scope;
    const mode = this.sortMode();

    if (scope === 'favorites' && mode === 'random') {
      return false;
    }

    return mode !== 'random';
  });
  public activeFilterPills = computed(() => {
    const filters = this.appliedFilters();
    const pills: Array<{
      key: string;
      kind: 'text' | 'sort';
      text?: string;
      icon?: string;
      ariaLabel: string;
    }> = [];

    if (filters.scope !== 'all') {
      pills.push({
        key: `scope-${filters.scope}`,
        kind: 'text',
        text: this.formatScopeLabel(filters.scope),
        ariaLabel: `Scope: ${this.formatScopeLabel(filters.scope)}`,
      });
    }

    pills.push({
      key: `sort-${filters.sort}`,
      kind: 'sort',
      icon: this.sortModeIcon(),
      ariaLabel: this.formatSortLabel(filters.sort),
    });

    if (filters.quoteQuery.trim().length > 0) {
      pills.push({
        key: `search-${filters.quoteQuery.trim()}`,
        kind: 'text',
        text: `Search: ${filters.quoteQuery.trim()}`,
        ariaLabel: `Search: ${filters.quoteQuery.trim()}`,
      });
    }

    for (const author of filters.by) {
      pills.push({
        key: `author-${author}`,
        kind: 'text',
        text: `By: ${author}`,
        ariaLabel: `By: ${author}`,
      });
    }

    return pills;
  });
  public targetableRecipientAuthors = computed(() => {
    return this.authors().filter((author) => this.isObjectId(author._id));
  });
  public canUploadProfilePicture = computed(() => {
    return (
      this.isObjectId(this.selectedProfilePictureAuthorId()) &&
      this.selectedProfilePictureFile() !== null &&
      !this.isUploadingProfilePicture()
    );
  });

  public ngOnInit(): void {
    this.titleService.setTitle('TD Quotes');

    const sortHint = this.route.snapshot.queryParamMap.get('sort');
    const scopeHint = this.route.snapshot.queryParamMap.get('scope');
    const shouldForceRecentNewest =
      scopeHint === 'recent' ||
      sortHint === 'recent' ||
      sortHint === 'desc';

    if (shouldForceRecentNewest) {
      this.store.resetFilters();
      this.store.setScope('recent');
      this.store.setSort('desc');
      this.appliedFilters.set(this.takeAppliedFiltersSnapshot());

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          scope: null,
          sort: null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    this.tdQuotesService
      .getAuthors()
      .pipe(take(1))
      .subscribe({
        next: (authors) => {
          const mergedAuthors = this.mergeCachedProfilePicturesIntoAuthors(authors);
          this.store.setAuthors(mergedAuthors);
          this.mergeAuthorMetadataIntoQuotes();
          this.loadMissingAuthorProfilePictures(mergedAuthors);
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

  public createNewUser(): void {
    const customUserName = this.newActiveUserName.trim();

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

              this.newActiveUserName = '';
              this.activeUserSaveError.set('');
              this.isSavingActiveUser.set(false);
            },
            error: () => {
              this.isSavingActiveUser.set(false);
              this.activeUserSaveError.set('Could not save user right now. Please try again.');
            },
          });
  }

  public confirmActiveUser(): void {
    if (this.isSavingActiveUser()) {
      return;
    }

    const existingUserId = this.selectedActiveUserId().trim();
    // const customUserName = this.newActiveUserName.trim();
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
    // } else if (customUserName) {
    //   const existingAuthorWithSameName = this.authors().find(
    //     (author) => author.name.trim().toLowerCase() === customUserName.toLowerCase()
    //   );

    //   if (existingAuthorWithSameName) {
    //     resolvedUser = {
    //       id: existingAuthorWithSameName._id,
    //       name: existingAuthorWithSameName.name,
    //     };
    //   } else {
    //     // this.isSavingActiveUser.set(true);
    //     // this.tdQuotesService
    //     //   .createAuthor(customUserName)
    //     //   .pipe(take(1))
    //     //   .subscribe({
    //     //     next: (createdAuthor) => {
    //     //       const authorExists = this.authors().some(
    //     //         (author) => author._id === createdAuthor._id
    //     //       );

    //     //       if (!authorExists) {
    //     //         this.store.addAuthor(createdAuthor);
    //     //       }

    //     //       this.finalizeActiveUserSelection({
    //     //         id: createdAuthor._id,
    //     //         name: createdAuthor.name,
    //     //       });
    //     //       this.isSavingActiveUser.set(false);
    //     //     },
    //     //     error: () => {
    //     //       this.isSavingActiveUser.set(false);
    //     //       this.activeUserSaveError.set('Could not save user right now. Please try again.');
    //     //     },
    //     //   });
    //     return;
    //   }
    }

    if (!resolvedUser) {
      return;
    }

    this.finalizeActiveUserSelection(resolvedUser);
  }

  public onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const nextScrollTop = Math.max(target.scrollTop, 0);
    const delta = nextScrollTop - this.lastOverviewScrollTop;

    this.hasScrolled.set(nextScrollTop > 0);

    if (nextScrollTop <= this.filtersToggleDeltaPx) {
      this.isFiltersRowVisible.set(true);
    } else if (delta > this.filtersToggleDeltaPx) {
      this.isFiltersRowVisible.set(false);
    } else if (delta < -this.filtersToggleDeltaPx) {
      this.isFiltersRowVisible.set(true);
    }

    this.lastOverviewScrollTop = nextScrollTop;
  }

  public openFilters(): void {
    this.closeHeaderMenu();
    this.closeQuickFab();
    this.filtersComponent.openFilters();
  }

  public toggleHeaderMenu(): void {
    this.closeQuickFab();
    this.isHeaderMenuOpen.update((isOpen) => !isOpen);
  }

  public closeHeaderMenu(): void {
    this.isHeaderMenuOpen.set(false);
  }

  public toggleQuickFab(): void {
    this.closeHeaderMenu();
    this.isQuickFabOpen.update((isOpen) => !isOpen);
  }

  public closeQuickFab(): void {
    this.isQuickFabOpen.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  public onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    const actionsElement = this.headerActionsElement?.nativeElement;
    if (this.isHeaderMenuOpen() && actionsElement && !actionsElement.contains(target)) {
      this.closeHeaderMenu();
    }

    const quickFabElement = this.quickFabClusterElement?.nativeElement;
    if (this.isQuickFabOpen() && quickFabElement && !quickFabElement.contains(target)) {
      this.closeQuickFab();
    }
  }

  public openLeaderboardFromMenu(): void {
    this.closeHeaderMenu();
    this.closeQuickFab();
    this.openLeaderboard();
  }

  public logoutActiveUser(): void {
    this.closeHeaderMenu();
    this.activeUser.set(null);
    this.resetFiltersAfterUserChange();
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
    this.secretModalTab.set('notification');
    this.secretNotificationAudience.set('all');
    this.secretRecipientAuthorIds.set([]);
    this.selectedProfilePictureAuthorId.set('');
    this.selectedProfilePictureFileName.set('');
    this.profilePictureUploadError.set('');
    this.isUploadingProfilePicture.set(false);
    this.selectedProfilePictureFile.set(null);
    this.profilePictureResetToken.update((value) => value + 1);
    this.isSecretModalOpen.set(true);
  }

  public setSecretModalTab(tab: 'notification' | 'user' | 'picture'): void {
    this.secretModalTab.set(tab);
    this.profilePictureUploadError.set('');
  }

  public closeSecretModal(): void {
    this.isSecretModalOpen.set(false);
    this.isSendingSecretNotification.set(false);
    this.isUploadingProfilePicture.set(false);
    this.profilePictureUploadError.set('');
  }

  public setProfilePictureAuthorId(authorId: string): void {
    this.selectedProfilePictureAuthorId.set(authorId);
    this.profilePictureUploadError.set('');
  }

  public setProfilePictureFile(file: File | null): void {
    this.selectedProfilePictureFile.set(file);
    this.selectedProfilePictureFileName.set(file?.name ?? '');
    this.profilePictureUploadError.set('');
  }

  public uploadSelectedProfilePicture(): void {
    if (!this.canUploadProfilePicture()) {
      return;
    }

    const authorId = this.selectedProfilePictureAuthorId();
    const sourceFile = this.selectedProfilePictureFile();
    if (!this.isObjectId(authorId) || !sourceFile) {
      return;
    }

    this.isUploadingProfilePicture.set(true);
    this.profilePictureUploadError.set('');

    void this.prepareProfilePicturePayload(sourceFile)
      .then((payload) => {
        this.tdQuotesService
          .uploadAuthorProfilePicture(authorId, payload.base64, payload.contentType)
          .pipe(take(1))
          .subscribe({
            next: (updatedAuthor) => {
              this.store.updateAuthor(updatedAuthor);
              this.store.setQuotes(
                this.quotes().map((quote) => {
                  if (quote.by._id !== updatedAuthor._id) {
                    return quote;
                  }

                  return {
                    ...quote,
                    by: {
                      ...quote.by,
                      ...updatedAuthor,
                    },
                  };
                })
              );
              this.loadMissingAuthorProfilePictures([updatedAuthor]);
              this.selectedProfilePictureAuthorId.set('');
              this.selectedProfilePictureFileName.set('');
              this.selectedProfilePictureFile.set(null);
              this.profilePictureResetToken.update((value) => value + 1);
              this.isUploadingProfilePicture.set(false);
            },
            error: () => {
              this.profilePictureUploadError.set('Could not upload image right now. Please try again.');
              this.isUploadingProfilePicture.set(false);
            },
          });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Could not process the selected image.';
        this.profilePictureUploadError.set(message);
        this.isUploadingProfilePicture.set(false);
      });
  }

  public canSendSecretNotification(): boolean {
    if (
      this.secretNotificationAudience() === 'selected' &&
      this.secretRecipientAuthorIds().length === 0
    ) {
      return false;
    }

    return true;
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
    const resolvedTitle = this.secretNotificationTitle.trim().length > 0
      ? this.secretNotificationTitle.trim()
      : this.pickRandomNotificationCopy(this.notifTitles, 'Very important notification');
    const resolvedBody = this.secretNotificationBody.trim().length > 0
      ? this.secretNotificationBody.trim()
      : this.pickRandomNotificationCopy(this.notifBodies, 'Someone added a new quote!');
    const recipientAuthorIds = this.secretNotificationAudience() === 'selected'
      ? this.secretRecipientAuthorIds()
      : undefined;

    this.tdQuotesService
      .sendNewQuotePushNotification(
        resolvedTitle,
        resolvedBody,
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
    this.closeQuickFab();
    this.createComponent.openCreate();
  }

  public openGame(): void {
    this.closeHeaderMenu();
    this.closeQuickFab();
    this.gameComponent.openGame();
  }

  public openLeaderboard(): void {
    this.closeQuickFab();
    this.leaderboardComponent.openLeaderboard();
  }

  public getQuotes(skip = false): void {
    this.appliedFilters.set(this.takeAppliedFiltersSnapshot());

    if (skip) {
      if (this.sortMode() === 'random') {
        this.refreshRandomOrder();
      }
      return;
    }

    this.isLoading.set(true);
    this.tdQuotesService
      .getTdQuotes()
      .pipe(take(1))
      .subscribe({
        next: (quotes) => {
          this.store.setQuotes(quotes);
          this.mergeAuthorMetadataIntoQuotes();

          if (this.sortMode() === 'random') {
            this.refreshRandomOrder(quotes);
          }

          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
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
    this.resetFiltersAfterUserChange();
    this.persistActiveUser(user);
    this.pushNotificationsService.syncSubscriptionWithActiveUser();
    this.isActiveUserModalOpen.set(false);
    this.selectedActiveUserId.set('');
    this.newActiveUserName = '';
    this.activeUserSaveError.set('');
  }

  private resetFiltersAfterUserChange(): void {
    this.store.resetFilters();
    this.appliedFilters.set(this.takeAppliedFiltersSnapshot());
    this.getQuotes();
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

  private mergeAuthorMetadataIntoQuotes(): void {
    const authorsById = new Map(
      this.authors().map((author) => [author._id, author])
    );

    this.store.setQuotes(
      this.quotes().map((quote) => {
        const enrichedAuthor = authorsById.get(quote.by._id);
        if (!enrichedAuthor) {
          return quote;
        }

        return {
          ...quote,
          by: {
            ...quote.by,
            ...enrichedAuthor,
          },
        };
      })
    );
  }

  private mergeCachedProfilePicturesIntoAuthors(
    authors: TdQuoteAuthorWithId[]
  ): TdQuoteAuthorWithId[] {
    const cachedDataUrls = this.profilePictureDataUrlsByAuthorId();

    return authors.map((author) => {
      const dataUrl = cachedDataUrls[author._id];
      if (!dataUrl) {
        return author;
      }

      return {
        ...author,
        profilePictureDataUrl: dataUrl,
      };
    });
  }

  private loadMissingAuthorProfilePictures(authors: TdQuoteAuthorWithId[]): void {
    const cachedDataUrls = this.profilePictureDataUrlsByAuthorId();

    for (const author of authors) {
      if (!author.hasProfilePicture || !this.isObjectId(author._id)) {
        continue;
      }

      if (cachedDataUrls[author._id] || this.profilePictureRequestsInFlight.has(author._id)) {
        continue;
      }

      this.profilePictureRequestsInFlight.add(author._id);
      this.tdQuotesService
        .getAuthorProfilePictureBlob(author._id)
        .pipe(take(1))
        .subscribe({
          next: (blob) => {
            void this.resolveProfilePictureDataUrl(blob)
              .then((dataUrl) => {
                this.profilePictureDataUrlsByAuthorId.update((current) => ({
                  ...current,
                  [author._id]: dataUrl,
                }));

                this.store.setAuthors(
                  this.authors().map((existingAuthor) => {
                    if (existingAuthor._id !== author._id) {
                      return existingAuthor;
                    }

                    return {
                      ...existingAuthor,
                      profilePictureDataUrl: dataUrl,
                    };
                  })
                );

                this.store.setQuotes(
                  this.quotes().map((quote) => {
                    if (quote.by._id !== author._id) {
                      return quote;
                    }

                    return {
                      ...quote,
                      by: {
                        ...quote.by,
                        profilePictureDataUrl: dataUrl,
                      },
                    };
                  })
                );
              })
              .finally(() => {
                this.profilePictureRequestsInFlight.delete(author._id);
              });
          },
          error: () => {
            this.profilePictureRequestsInFlight.delete(author._id);
          },
        });
    }
  }

  private async resolveProfilePictureDataUrl(blob: Blob): Promise<string> {
    if (blob.type.startsWith('image/')) {
      return this.blobToDataUrl(blob);
    }

    const payloadText = await blob.text();
    const payload = this.tryParseJson(payloadText);
    const resolvedFromPayload = this.resolveProfilePictureDataUrlFromPayload(payload);

    if (resolvedFromPayload) {
      return resolvedFromPayload;
    }

    throw new Error('Unsupported profile picture response format.');
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private resolveProfilePictureDataUrlFromPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const candidate = payload as {
      profilePictureDataUrl?: unknown;
      profilePictureUrl?: unknown;
      profilePictureBase64?: unknown;
      dataBase64?: unknown;
      profilePictureContentType?: unknown;
      profilePicture?: unknown;
      contentType?: unknown;
      base64?: unknown;
    };

    if (
      typeof candidate.profilePictureDataUrl === 'string' &&
      candidate.profilePictureDataUrl.trim().length > 0
    ) {
      return candidate.profilePictureDataUrl;
    }

    if (
      typeof candidate.profilePictureUrl === 'string' &&
      candidate.profilePictureUrl.trim().length > 0
    ) {
      return candidate.profilePictureUrl;
    }

    const base64Payload =
      typeof candidate.profilePictureBase64 === 'string' &&
      candidate.profilePictureBase64.trim().length > 0
        ? candidate.profilePictureBase64
        : typeof candidate.dataBase64 === 'string' && candidate.dataBase64.trim().length > 0
          ? candidate.dataBase64
        : typeof candidate.base64 === 'string' && candidate.base64.trim().length > 0
          ? candidate.base64
          : null;

    const contentType =
      typeof candidate.profilePictureContentType === 'string' &&
      candidate.profilePictureContentType.trim().length > 0
        ? candidate.profilePictureContentType
        : typeof candidate.contentType === 'string' && candidate.contentType.trim().length > 0
          ? candidate.contentType
          : 'image/jpeg';

    if (base64Payload) {
      return `data:${contentType};base64,${base64Payload}`;
    }

    const bufferBase64 = this.extractBase64FromSerializedBuffer(candidate.profilePicture);
    if (bufferBase64) {
      return `data:${contentType};base64,${bufferBase64}`;
    }

    return null;
  }

  private extractBase64FromSerializedBuffer(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const maybeBuffer = value as { type?: unknown; data?: unknown };
    if (maybeBuffer.type !== 'Buffer' || !Array.isArray(maybeBuffer.data)) {
      return null;
    }

    const bytes = maybeBuffer.data;
    if (!bytes.every((item) => typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 255)) {
      return null;
    }

    return this.uint8ArrayToBase64(new Uint8Array(bytes));
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
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

        const creatorAuthorId = this.isObjectId(res.by._id) ? res.by._id : undefined;

        this.tdQuotesService
          .sendNewQuotePushNotification(
            this.pickRandomNotificationCopy(this.notifTitles, 'Very important notification'),
            this.pickRandomNotificationCopy(this.notifBodies, 'Someone added a new quote!'),
            undefined,
            creatorAuthorId ? [creatorAuthorId] : undefined
          )
          .pipe(take(1))
          .subscribe({
            error: () => {
              // No-op so quote creation never fails due to notification issues.
            },
          });
      });
  }

  public  installPwa(): void {
    void this.pwaInstallService.install();
  }

  private takeAppliedFiltersSnapshot(): {
    by: string[];
    quoteQuery: string;
    scope: 'all' | 'recent' | 'favorites';
    sort: QuoteSort;
  } {
    const filters = this.store.filters();
    return {
      by: [...filters.by],
      quoteQuery: filters.quoteQuery,
      scope: filters.scope,
      sort: filters.sort,
    };
  }

  private formatScopeLabel(scope: 'all' | 'recent' | 'favorites'): string {
    return scope.charAt(0).toUpperCase() + scope.slice(1);
  }

  private formatSortLabel(sort: QuoteSort): string {
    if (sort === 'desc') {
      return 'Sort: newest first';
    }

    if (sort === 'asc') {
      return 'Sort: oldest first';
    }

    return 'Sort: random';
  }

  private pickRandomNotificationCopy(options: string[], fallback: string): string {
    const validOptions = options.filter((option) => option.trim().length > 0);
    if (validOptions.length === 0) {
      return fallback;
    }

    const randomIndex = Math.floor(Math.random() * validOptions.length);
    return validOptions[randomIndex];
  }

  private async prepareProfilePicturePayload(file: File): Promise<{ base64: string; contentType: string }> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file.');
    }

    if (file.size <= this.maxProfilePictureBytes) {
      return this.fileToBase64Payload(file);
    }

    return this.compressImageToMaxSize(file, this.maxProfilePictureBytes);
  }

  private async fileToBase64Payload(file: Blob): Promise<{ base64: string; contentType: string }> {
    const dataUrl = await this.blobToDataUrl(file);
    const payloadMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!payloadMatch) {
      throw new Error('Unsupported image format. Please try another file.');
    }

    const contentType = payloadMatch[1];
    const base64 = payloadMatch[2];
    const byteSize = this.base64ByteLength(base64);
    if (byteSize > this.maxProfilePictureBytes) {
      throw new Error('Image is still above 1MB after processing. Please choose a smaller image.');
    }

    return { base64, contentType };
  }

  private async compressImageToMaxSize(
    file: File,
    maxBytes: number,
  ): Promise<{ base64: string; contentType: string }> {
    const image = await this.loadImageElement(file);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not initialize image processing.');
    }

    const targetTypes = Array.from(
      new Set([
        file.type.startsWith('image/') ? file.type : 'image/jpeg',
        'image/jpeg',
        'image/webp',
      ])
    );
    const scales = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36];
    const qualities = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36];

    for (const scale of scales) {
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (const contentType of targetTypes) {
        if (contentType === 'image/png') {
          const pngBlob = await this.canvasToBlob(canvas, contentType);
          if (pngBlob.size <= maxBytes) {
            return this.fileToBase64Payload(pngBlob);
          }
          continue;
        }

        for (const quality of qualities) {
          const candidateBlob = await this.canvasToBlob(canvas, contentType, quality);
          if (candidateBlob.size <= maxBytes) {
            return this.fileToBase64Payload(candidateBlob);
          }
        }
      }
    }

    throw new Error('Could not compress image below 1MB. Please choose a smaller image.');
  }

  private loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onerror = () => reject(new Error('Could not read image file.'));
      fileReader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Could not load image for compression.'));
        image.onload = () => resolve(image);
        image.src = String(fileReader.result || '');
      };
      fileReader.readAsDataURL(file);
    });
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed.'));
            return;
          }
          resolve(blob);
        },
        type,
        quality,
      );
    });
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onerror = () => reject(new Error('Could not convert image to upload format.'));
      fileReader.onload = () => resolve(String(fileReader.result || ''));
      fileReader.readAsDataURL(blob);
    });
  }

  private base64ByteLength(base64: string): number {
    const normalized = base64.replace(/\s+/g, '');
    const paddingLength = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
    return (normalized.length * 3) / 4 - paddingLength;
  }

  private parseDateForSort(dateValue: string | null | undefined): {
    isValid: boolean;
    timestamp: number;
  } {
    const rawValue = typeof dateValue === 'string' ? dateValue.trim() : '';
    if (!rawValue) {
      return {
        isValid: false,
        timestamp: 0,
      };
    }

    const ddMmYyyyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(rawValue);
    if (ddMmYyyyMatch) {
      const day = Number(ddMmYyyyMatch[1]);
      const month = Number(ddMmYyyyMatch[2]);
      const year = Number(ddMmYyyyMatch[3]);
      const timestamp = Date.UTC(year, month - 1, day);

      if (!Number.isNaN(timestamp)) {
        return {
          isValid: true,
          timestamp,
        };
      }
    }

    const parsed = Date.parse(rawValue);
    if (Number.isNaN(parsed)) {
      return {
        isValid: false,
        timestamp: 0,
      };
    }

    return {
      isValid: true,
      timestamp: parsed,
    };
  }

  private refreshRandomOrder(quotesOverride?: TdQuoteWithId[]): void {
    const ids = (quotesOverride ?? this.quotes()).map((quote) => quote._id);
    const shuffledIds = [...ids];

    for (let index = shuffledIds.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const currentId = shuffledIds[index];
      shuffledIds[index] = shuffledIds[randomIndex];
      shuffledIds[randomIndex] = currentId;
    }

    const rank: Record<string, number> = {};
    shuffledIds.forEach((id, index) => {
      rank[id] = index;
    });

    this.randomOrderRank.set(rank);
  }
}
