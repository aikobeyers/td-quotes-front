import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TdQuoteWithId } from '../models/TdQuote';
import { TdQuoteAuthorWithId } from '../models/TdQuoteAuthor';
import { FiltersStore } from '../stores/filters.store';
import { Observable } from 'rxjs';

const BASE_URL: string = environment.baseUrl;


@Injectable({
  providedIn: 'root'
})
export class TdQuotesService {
  private readonly filtersStore = inject(FiltersStore);
 
  constructor(private readonly http: HttpClient) { }

  public getAuthors() {
    return this.http.get<TdQuoteAuthorWithId[]>(`${BASE_URL}/tdquotes/authors`);
  }

  public getTdQuotes() {
    let params = new HttpParams();
    const filters = this.filtersStore.filters();

    if (filters.by.length > 0) {
      params = params.set('by', filters.by.join(','));
    }

    if (filters.quoteQuery.trim() !== '') {
      params = params.set('quoteQuery', filters.quoteQuery);
    }

    return this.http.get<TdQuoteWithId[]>(`${BASE_URL}/tdquotes/get`, { params });
  }

  public createQuote(req: {value: string, date: string, by: string | undefined | null, newAuthor: string| undefined | null}): Observable<TdQuoteWithId> {
    return this.http.post<TdQuoteWithId>(`${BASE_URL}/tdquotes/create`, req);
  }

  public getRandomQuote(): Observable<TdQuoteWithId> {
    return this.http.get<TdQuoteWithId>(`${BASE_URL}/tdquotes/random`);
  }

  public updateAuthorScore(authorId: string): Observable<TdQuoteAuthorWithId> {
    return this.http.put<TdQuoteAuthorWithId>(`${BASE_URL}/tdquotes/authors/${authorId}/score`, {});
  }
}
