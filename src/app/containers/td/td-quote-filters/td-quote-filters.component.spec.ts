import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TdQuoteFiltersComponent } from './td-quote-filters.component';

describe('TdQuoteFiltersComponent', () => {
  let component: TdQuoteFiltersComponent;
  let fixture: ComponentFixture<TdQuoteFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TdQuoteFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TdQuoteFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
