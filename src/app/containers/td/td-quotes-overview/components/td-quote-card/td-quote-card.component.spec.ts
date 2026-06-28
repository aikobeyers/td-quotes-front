import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TdQuoteCardComponent } from './td-quote-card.component';

describe('TdQuoteCardComponent', () => {
  let component: TdQuoteCardComponent;
  let fixture: ComponentFixture<TdQuoteCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TdQuoteCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TdQuoteCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
