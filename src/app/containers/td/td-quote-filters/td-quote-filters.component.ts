import { Component, inject, output, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FiltersStore } from '../../../stores/filters.store';
import { NgClass } from '@angular/common';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-td-quote-filters',
  imports: [NgClass, MatIcon],
  templateUrl: './td-quote-filters.component.html',
  styleUrl: './td-quote-filters.component.scss',
})
export class TdQuoteFiltersComponent implements OnDestroy {
  private readonly store = inject(FiltersStore);
  private readonly document = inject(DOCUMENT);

  public authors = this.store.authors;
  public quoteQuery = this.store.quoteQuery;

  public isOpen = false;

  public filterSnapshot? :{ by: string[]; quoteQuery: string };

  public closeFiltersEmitter = output<boolean>();

  toggleAuthor(author: string): void {    
    this.store.toggleAuthor(author);    
  }

  setTextFilter(filter: string): void {
    this.store.setQuoteQuery(filter);
  }

  clearTextFilter(): void {
    this.store.setQuoteQuery('');
  }

  isSelected(author: string): boolean {
    return this.store.filterBy().includes(author);
  }

  resetFilters(): void {
    this.store.resetFilters();
  }

  closeFilters (revert = false): void {
    
    if(revert && this.filterSnapshot) {
      this.store.setFilters(this.filterSnapshot);
    }
    this.setOpen(false);
    this.filterSnapshot = undefined;
    this.closeFiltersEmitter.emit(revert);
  }

  openFilters(): void {
    this.setOpen(true);
    this.filterSnapshot = this.takeFiltersSnapshot();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('filters--open');
  }

  private setOpen(isOpen: boolean): void {
    this.isOpen = isOpen;
    this.document.body.classList.toggle('filters--open', isOpen);
  }

  private takeFiltersSnapshot(): { by: string[]; quoteQuery: string } {
    return {
      by: [...this.store.filterBy()],
      quoteQuery: this.store.quoteQuery(),
    };
  }
}
 