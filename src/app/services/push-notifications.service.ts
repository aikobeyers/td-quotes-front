import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom, fromEvent, merge, take } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';
import { TdQuotesService } from './td-quotes.service';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationsService {
  private readonly swPush = inject(SwPush);
  private readonly tdQuotesService = inject(TdQuotesService);
  private readonly activeUserStorageKey = 'td_quotes_active_user';

  private initialized = false;

  public notificationsSupported = signal(false);
  public canRequestPermission = signal(false);
  public permissionDenied = signal(false);
  public subscriptionInProgress = signal(false);
  private ensureSubscriptionInProgress = false;

  public initPushNotifications(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    if (!this.swPush.isEnabled || typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    this.notificationsSupported.set(true);

    if (Notification.permission === 'granted') {
      void this.ensureSubscription();
    } else if (Notification.permission === 'default') {
      this.canRequestPermission.set(true);
    } else {
      this.permissionDenied.set(true);
    }

    merge(
      fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible')),
      fromEvent(window, 'focus'),
    )
      .pipe(startWith(null))
      .subscribe(() => {
        if (Notification.permission === 'granted') {
          void this.ensureSubscription();
        }
      });
  }

  public async requestPermissionFromUserGesture(): Promise<void> {
    if (!this.notificationsSupported() || this.subscriptionInProgress()) {
      return;
    }

    this.subscriptionInProgress.set(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        this.canRequestPermission.set(false);
        this.permissionDenied.set(false);
        await this.ensureSubscription();
        return;
      }

      this.canRequestPermission.set(false);
      this.permissionDenied.set(permission === 'denied');
    } finally {
      this.subscriptionInProgress.set(false);
    }
  }

  public syncSubscriptionWithActiveUser(): void {
    if (!this.notificationsSupported() || Notification.permission !== 'granted') {
      return;
    }

    void this.ensureSubscription();
  }

  private async ensureSubscription(): Promise<void> {
    if (this.ensureSubscriptionInProgress) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    this.ensureSubscriptionInProgress = true;

    try {
      const currentSubscription = await firstValueFrom(this.swPush.subscription.pipe(take(1)));
      const publicKeyResp = await firstValueFrom(this.tdQuotesService.getPushPublicKey().pipe(take(1)));
      const publicKey = publicKeyResp?.publicKey?.trim();

      if (!publicKey) {
        return;
      }

      const subscription = currentSubscription
        ?? await this.swPush.requestSubscription({ serverPublicKey: publicKey });

      await firstValueFrom(
        this.tdQuotesService
          .registerPushSubscription(
            subscription.toJSON(),
            this.loadActiveUserIdFromCookie()
          )
          .pipe(take(1)),
      );

      this.canRequestPermission.set(false);
      this.permissionDenied.set(false);
    } catch (error) {
      console.error('Push subscription setup failed:', error);
    } finally {
      this.ensureSubscriptionInProgress = false;
    }
  }

  private loadActiveUserIdFromCookie(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const prefix = `${this.activeUserStorageKey}=`;
    const parts = document.cookie.split(';');

    for (const part of parts) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) {
        continue;
      }

      const rawValue = decodeURIComponent(cookie.slice(prefix.length));

      try {
        const parsed = JSON.parse(rawValue) as { id?: unknown };
        if (typeof parsed.id === 'string' && /^[a-f\d]{24}$/i.test(parsed.id.trim())) {
          return parsed.id.trim();
        }
      } catch {
        return null;
      }
    }

    return null;
  }
}
