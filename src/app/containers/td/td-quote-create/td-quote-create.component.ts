import { Component, inject, output, OnDestroy } from '@angular/core';
import { DOCUMENT, NgClass } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FiltersStore } from '../../../stores/filters.store';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-td-quote-create',
  imports: [NgClass, MatIcon, ReactiveFormsModule],
  templateUrl: './td-quote-create.component.html',
  styleUrl: './td-quote-create.component.scss',
})
export class TdQuoteCreateComponent implements OnDestroy {
  private readonly store = inject(FiltersStore);
  private readonly document = inject(DOCUMENT);

  public authors = this.store.authors;

  public quoteForm = new FormGroup({
    quote: new FormControl(''),
    by: new FormControl(''),
    newAuthor: new FormControl('')
  });

  public isOpen = false;

  public closeCreateEmitter = output<boolean>();
  public createQuoteEmitter = output<{value: string, date: string, by: string | undefined | null, newAuthor: string| undefined | null}>();

  selectAuthor(author: string): void {
    if (this.isSelectedAuthor(author)) {
      // Unselect if already selected
      this.quoteForm.controls.by.setValue('');
      this.quoteForm.controls.newAuthor.enable();
    } else {
      // Select the author
      this.quoteForm.controls.by.setValue(author);
      this.quoteForm.controls.newAuthor.setValue('');
      this.quoteForm.controls.newAuthor.disable();
    }
  }

  isSelectedAuthor(author: string): boolean {
    return this.quoteForm.controls.by.value === author;
  }

  saveQuote(): void {
    const formValue = this.quoteForm.value;
    console.log('Quote:', formValue.quote);
    console.log('Author:', formValue.by);
    console.log('New author:', formValue.newAuthor);

    const today = new Date();
    const dateString = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const quoteData = {
      value: formValue.quote!,
      by: formValue.by,
      newAuthor: formValue.newAuthor,
      date: dateString
    };
    this.createQuoteEmitter.emit(quoteData);

    this.closeCreate(true);
  }

  closeCreate(cancel = false): void {
    this.setOpen(false);
    if (cancel) {
      this.quoteForm.reset();
      this.quoteForm.controls.newAuthor.enable();
    }
    this.closeCreateEmitter.emit(cancel);
    this.quoteForm.reset();

  }

  openCreate(): void {
    this.setOpen(true);
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('create--open');
  }

  private setOpen(isOpen: boolean): void {
    this.isOpen = isOpen;
    this.document.body.classList.toggle('create--open', isOpen);
  }
}
