import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom, take } from 'rxjs';
import { TdQuotesService } from './td-quotes.service';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationsService {
  private readonly swPush = inject(SwPush);
  private readonly tdQuotesService = inject(TdQuotesService);

  private initialized = false;

  public initPushNotifications(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    if (!this.swPush.isEnabled || typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    this.ensureSubscription();
  }

  private async ensureSubscription(): Promise<void> {
    if (Notification.permission === 'denied') {
      return;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      return;
    }

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
          .registerPushSubscription(subscription.toJSON())
          .pipe(take(1)),
      );
    } catch {
      // No-op for now; push setup should not block app usage.
    }
  }
}
