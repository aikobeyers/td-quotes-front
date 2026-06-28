import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { TdQuotesService } from '../../../services/td-quotes.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TdQuoteCardComponent } from "./components/td-quote-card/td-quote-card.component";
import { CommonModule } from '@angular/common';
import { MatIcon } from "@angular/material/icon";
import { Title } from '@angular/platform-browser';
import { FiltersStore } from '../../../stores/filters.store';
import { RouterLink } from "@angular/router";
import { TdQuoteFiltersComponent } from "../td-quote-filters/td-quote-filters.component";
import { take } from 'rxjs';
import { TdQuoteCreateComponent } from "../td-quote-create/td-quote-create.component";
import { TdQuoteWithId } from '../../../models/TdQuote';
import { TdQuoteGameComponent } from "../td-quote-game/td-quote-game.component";
import { TdQuotesLeaderboardComponent } from "../td-quotes-leaderboard/td-quotes-leaderboard.component";

@Component({
  selector: 'app-td-quotes-overview',
  providers: [Title],
  imports: [TdQuoteCardComponent, CommonModule, MatIcon, TdQuoteFiltersComponent, TdQuoteCreateComponent, TdQuoteGameComponent, TdQuotesLeaderboardComponent],
  templateUrl: './td-quotes-overview.component.html',
  styleUrl: './td-quotes-overview.component.scss'
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

  public quotes = this.store.quotes

  public isLoading = signal(false);
  public hasScrolled = signal(false);

  public ngOnInit(): void {
    this.titleService.setTitle('TD Quotes');
    this.tdQuotesService.getAuthors()
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
      this.tdQuotesService.getTdQuotes().pipe(take(1)).subscribe((quotes) => {
        this.store.setQuotes(quotes);
        this.isLoading.set(false);
      });
    }
  }

  public createQuote(quoteData: {value: string, date: string, by: string | undefined | null, newAuthor: string| undefined | null}): void {
    this.tdQuotesService.createQuote(quoteData).pipe(take(1)).subscribe((res: TdQuoteWithId) => {
      this.store.addQuote(res);
      if (res.by && quoteData.newAuthor) {
        this.store.addAuthor(res.by);
      }
    });
  }
}
