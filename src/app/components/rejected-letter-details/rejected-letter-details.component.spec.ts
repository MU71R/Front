import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectedLetterDetailsComponent } from './rejected-letter-details.component';

describe('RejectedLetterDetailsComponent', () => {
  let component: RejectedLetterDetailsComponent;
  let fixture: ComponentFixture<RejectedLetterDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RejectedLetterDetailsComponent]
    });
    fixture = TestBed.createComponent(RejectedLetterDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
