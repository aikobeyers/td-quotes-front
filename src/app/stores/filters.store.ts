import { Injectable } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';
import { TdQuote, TdQuoteWithId } from '../models/TdQuote';
import { TdQuoteAuthorWithId } from '../models/TdQuoteAuthor';

export type FiltersState = {
    filters:{
        by: string[];
        quoteQuery: string;
    };
    authors: TdQuoteAuthorWithId[];
  quotes: TdQuoteWithId[];
};

const initialFiltersState: FiltersState = {
    filters: {
        by: [],
        quoteQuery: '',
    },
    authors: [],
    quotes: [],
};

export const FiltersStore = signalStore(
  { providedIn: 'root' },
  withState(initialFiltersState),
  withMethods((store) => ({
    setFilterBy(by: string[]): void {
      patchState(store, { filters: { ...store.filters(), by } });
    },
    setQuoteQuery(quoteQuery: string): void {
      patchState(store, { filters: { ...store.filters(), quoteQuery } });
    },
    setFilters(filters: Partial<{ by: string[]; quoteQuery: string }>): void {
      patchState(store, { filters: { ...store.filters(), ...filters } });
    },
    setAuthors(authors: TdQuoteAuthorWithId[]): void {
      patchState(store, { authors });
    },
    setQuotes(quotes: TdQuoteWithId[]): void {
      patchState(store, { quotes });
    },
    addQuote(quote: TdQuoteWithId): void {
      patchState(store, { quotes: [...store.quotes(), quote] });
    },
    addAuthor(author: TdQuoteAuthorWithId): void {
      const authors = store.authors();
      const exists = authors.some(a => a._id === author._id);
      if (!exists) {
        patchState(store, { authors: [...authors, author] });
      }
    },
    updateAuthor(updatedAuthor: TdQuoteAuthorWithId): void {
      const authors = store.authors();
      const index = authors.findIndex(a => a._id === updatedAuthor._id);
      if (index !== -1) {
        const newAuthors = [...authors];
        newAuthors[index] = updatedAuthor;
        patchState(store, { authors: newAuthors });
      }
    },
    resetFilters(): void {
      patchState(store, { filters: { by: [], quoteQuery: '' } });
    },
    toggleAuthor(author: string): void {
      const currentAuthors = store.filters().by;
      if (currentAuthors.includes(author)) {
        patchState(store, { filters: { ...store.filters(), by: currentAuthors.filter(a => a !== author) } });
      } else {
        patchState(store, { filters: { ...store.filters(), by: [...currentAuthors, author] } });
      }
    },
  })),
  withComputed((store) => ({
    filterBy: computed(() => store.filters().by),
    quoteQuery: computed(() => store.filters().quoteQuery),
    authors: computed(() => store.authors()),
    quotes: computed(() => store.quotes()),
  }))
);
