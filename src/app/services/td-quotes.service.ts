import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TdQuoteWithId } from '../models/TdQuote';
import { TdQuoteAuthorWithId } from '../models/TdQuoteAuthor';
import { FiltersStore } from '../stores/filters.store';
import { Observable, of } from 'rxjs';

const BASE_URL: string = environment.baseUrl;


@Injectable({
  providedIn: 'root'
})
export class TdQuotesService {
  private readonly filtersStore = inject(FiltersStore);
  private readonly activeUserStorageKey = 'td_quotes_active_user';
 
  constructor(private readonly http: HttpClient) { }

  public getAuthors() {
    return this.http.get<TdQuoteAuthorWithId[]>(`${BASE_URL}/tdquotes/authors`);
  }

  public getTdQuotes() {
    let params = new HttpParams();
    const filters = this.filtersStore.filters();

    params = params.set('scope', filters.scope);

    if (filters.scope === 'favorites') {
      const activeUser = this.loadActiveUserFromCookie();

      if (!activeUser?.id) {
        return of([] as TdQuoteWithId[]);
      }

      params = params.set('userId', activeUser.id);
    }

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

  public getPushPublicKey(): Observable<{ publicKey: string }> {
    return this.http.get<{ publicKey: string }>(`${BASE_URL}/push/public-key`);
  }

  public registerPushSubscription(subscription: PushSubscriptionJSON): Observable<void> {
    return this.http.post<void>(`${BASE_URL}/push/subscribe`, { subscription });
  }

  public sendNewQuotePushNotification(title: string, body: string): Observable<void> {
    return this.http.post<void>(`${BASE_URL}/push/broadcast`, {
      title,
      body,
    });
  }

  private loadActiveUserFromCookie(): { id: string; name: string } | null {
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
      return null;
    }

    return null;
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
}
