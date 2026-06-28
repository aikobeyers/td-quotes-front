import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PushNotificationsService } from './services/push-notifications.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly pushNotificationsService = inject(PushNotificationsService);

  public ngOnInit(): void {
    this.pushNotificationsService.initPushNotifications();
  }
}
