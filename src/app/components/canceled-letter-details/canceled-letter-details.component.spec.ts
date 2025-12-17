import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanceledLetterDetailsComponent } from './canceled-letter-details.component';

describe('CanceledLetterDetailsComponent', () => {
  let component: CanceledLetterDetailsComponent;
  let fixture: ComponentFixture<CanceledLetterDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CanceledLetterDetailsComponent]
    });
    fixture = TestBed.createComponent(CanceledLetterDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
