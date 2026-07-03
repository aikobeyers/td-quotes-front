import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, computed, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TdQuoteAuthorWithId } from '../../../../../models/TdQuoteAuthor';

@Component({
  selector: 'app-td-secret-modal',
  imports: [CommonModule, FormsModule, MatIcon],
  templateUrl: './td-secret-modal.component.html',
  styleUrl: './td-secret-modal.component.scss',
})
export class TdSecretModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly tab = input<'notification' | 'user'>('notification');
  readonly secretNotificationTitle = input<string>('');
  readonly secretNotificationBody = input<string>('');
  readonly secretNotificationAudience = input<'all' | 'selected'>('all');
  readonly targetableRecipientAuthors = input<TdQuoteAuthorWithId[]>([]);
  readonly selectedRecipientAuthorIds = input<string[]>([]);
  readonly newActiveUserName = input<string>('');
  readonly activeUserSaveError = input<string>('');
  readonly canSendNotification = input<boolean>(false);
  readonly isSendingNotification = input<boolean>(false);
  readonly canCreateUser = input<boolean>(false);
  readonly isSavingUser = input<boolean>(false);

  readonly close = output<void>();
  readonly tabChange = output<'notification' | 'user'>();
  readonly notificationTitleChange = output<string>();
  readonly notificationBodyChange = output<string>();
  readonly notificationAudienceChange = output<'all' | 'selected'>();
  readonly recipientToggle = output<string>();
  readonly newActiveUserNameInput = output<string>();
  readonly sendNotification = output<void>();
  readonly createUser = output<void>();

  readonly isNotificationTab = computed(() => this.tab() === 'notification');

  public isRecipientSelected(authorId: string): boolean {
    return this.selectedRecipientAuthorIds().includes(authorId);
  }
}
