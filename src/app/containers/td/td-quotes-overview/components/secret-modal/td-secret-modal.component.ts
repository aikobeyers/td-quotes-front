import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, computed, effect, ElementRef, input, output, viewChild } from '@angular/core';
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
  readonly tab = input<'notification' | 'user' | 'picture'>('notification');
  readonly secretNotificationTitle = input<string>('');
  readonly secretNotificationBody = input<string>('');
  readonly secretNotificationAudience = input<'all' | 'selected'>('all');
  readonly targetableRecipientAuthors = input<TdQuoteAuthorWithId[]>([]);
  readonly selectedRecipientAuthorIds = input<string[]>([]);
  readonly newActiveUserName = input<string>('');
  readonly profilePictureAuthorId = input<string>('');
  readonly profilePictureError = input<string>('');
  readonly profilePictureFileName = input<string>('');
  readonly profilePictureResetToken = input<number>(0);
  readonly activeUserSaveError = input<string>('');
  readonly canSendNotification = input<boolean>(false);
  readonly isSendingNotification = input<boolean>(false);
  readonly canCreateUser = input<boolean>(false);
  readonly isSavingUser = input<boolean>(false);
  readonly canUploadProfilePicture = input<boolean>(false);
  readonly isUploadingProfilePicture = input<boolean>(false);

  readonly close = output<void>();
  readonly tabChange = output<'notification' | 'user' | 'picture'>();
  readonly notificationTitleChange = output<string>();
  readonly notificationBodyChange = output<string>();
  readonly notificationAudienceChange = output<'all' | 'selected'>();
  readonly recipientToggle = output<string>();
  readonly newActiveUserNameInput = output<string>();
  readonly profilePictureAuthorIdChange = output<string>();
  readonly profilePictureFileSelected = output<File | null>();
  readonly sendNotification = output<void>();
  readonly createUser = output<void>();
  readonly uploadProfilePicture = output<void>();

  readonly isNotificationTab = computed(() => this.tab() === 'notification');
  readonly isUserTab = computed(() => this.tab() === 'user');
  readonly isPictureTab = computed(() => this.tab() === 'picture');
  readonly profilePictureFileInput = viewChild<ElementRef<HTMLInputElement>>('profilePictureFileInput');

  constructor() {
    effect(() => {
      this.profilePictureResetToken();
      const inputElement = this.profilePictureFileInput()?.nativeElement;
      if (!inputElement) {
        return;
      }

      inputElement.value = '';
    });
  }

  public isRecipientSelected(authorId: string): boolean {
    return this.selectedRecipientAuthorIds().includes(authorId);
  }

  public onProfilePictureFileInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    const selectedFile = inputElement?.files?.[0] ?? null;
    this.profilePictureFileSelected.emit(selectedFile);
  }
}
