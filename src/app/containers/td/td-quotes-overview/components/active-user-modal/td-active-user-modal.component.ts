import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TdQuoteAuthorWithId } from '../../../../../models/TdQuoteAuthor';

@Component({
  selector: 'app-td-active-user-modal',
  imports: [CommonModule],
  templateUrl: './td-active-user-modal.component.html',
  styleUrl: './td-active-user-modal.component.scss',
})
export class TdActiveUserModalComponent {
  readonly canInstall = input<boolean>(false);
  readonly isOpen = input<boolean>(false);
  readonly authors = input<TdQuoteAuthorWithId[]>([]);
  readonly selectedActiveUserId = input<string>('');
  readonly canConfirm = input<boolean>(false);
  readonly isSaving = input<boolean>(false);

  readonly installPwa = output<void>();
  readonly selectUser = output<TdQuoteAuthorWithId>();
  readonly confirm = output<void>();
}
