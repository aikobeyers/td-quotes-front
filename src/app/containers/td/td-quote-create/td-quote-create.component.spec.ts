import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TdQuoteCreateComponent } from './td-quote-create.component';

describe('TdQuoteCreateComponent', () => {
  let component: TdQuoteCreateComponent;
  let fixture: ComponentFixture<TdQuoteCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TdQuoteCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TdQuoteCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
