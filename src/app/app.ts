import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdateService } from './services/app-update.service';
import { PushNotificationsService } from './services/push-notifications.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly appUpdateService = inject(AppUpdateService);
  private readonly pushNotificationsService = inject(PushNotificationsService);

  public updateAvailable = this.appUpdateService.updateAvailable;
  public updateInProgress = this.appUpdateService.updateInProgress;

  public ngOnInit(): void {
    this.appUpdateService.initUpdateChecks();
    this.pushNotificationsService.initPushNotifications();
  }

  public refreshApp(): void {
    void this.appUpdateService.applyUpdate();
  }
}
