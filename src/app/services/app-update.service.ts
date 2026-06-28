import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { fromEvent, merge } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private initialized = false;

  public updateAvailable = signal(false);
  public updateInProgress = signal(false);

  public initUpdateChecks(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    if (!this.swUpdate.isEnabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
      });

    merge(
      fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible')),
      fromEvent(window, 'focus'),
    )
      .pipe(startWith(null))
      .subscribe(() => {
        void this.swUpdate.checkForUpdate().catch(() => {
          // Ignore transient update check failures.
        });
      });
  }

  public async applyUpdate(): Promise<void> {
    if (this.updateInProgress()) {
      return;
    }

    this.updateInProgress.set(true);

    try {
      await this.swUpdate.activateUpdate();
      window.location.reload();
    } catch {
      this.updateInProgress.set(false);
    }
  }
}
