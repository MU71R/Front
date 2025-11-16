import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectedLettersListComponent } from './rejected-letters-list.component';

describe('RejectedLettersListComponent', () => {
  let component: RejectedLettersListComponent;
  let fixture: ComponentFixture<RejectedLettersListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RejectedLettersListComponent]
    });
    fixture = TestBed.createComponent(RejectedLettersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
