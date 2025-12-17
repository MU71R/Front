import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanceledLettersListComponent } from './canceled-letters-list.component';

describe('CanceledLettersListComponent', () => {
  let component: CanceledLettersListComponent;
  let fixture: ComponentFixture<CanceledLettersListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CanceledLettersListComponent]
    });
    fixture = TestBed.createComponent(CanceledLettersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
