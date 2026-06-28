import { Component, inject, output, OnDestroy, computed } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { FiltersStore } from '../../../stores/filters.store';

@Component({
  selector: 'app-td-quotes-leaderboard',
  imports: [NgClass, MatIcon],
  templateUrl: './td-quotes-leaderboard.component.html',
  styleUrl: './td-quotes-leaderboard.component.scss',
})
export class TdQuotesLeaderboardComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(FiltersStore);

  public isOpen = false;
  public rankedAuthors = computed(() => {
    return [...this.store.authors()]
      .sort((a, b) => b.score - a.score);
  });

  public closeLeaderboardEmitter = output<void>();

  openLeaderboard(): void {
    this.setOpen(true);
  }

  closeLeaderboard(): void {
    this.setOpen(false);
    this.closeLeaderboardEmitter.emit();
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    if (open) {
      this.document.body.classList.add('leaderboard--open');
    } else {
      this.document.body.classList.remove('leaderboard--open');
    }
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('leaderboard--open');
  }
}
