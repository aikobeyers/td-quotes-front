import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TdQuotesOverviewComponent } from './td-quotes-overview.component';

describe('TdQuotesOverviewComponent', () => {
  let component: TdQuotesOverviewComponent;
  let fixture: ComponentFixture<TdQuotesOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TdQuotesOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TdQuotesOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
