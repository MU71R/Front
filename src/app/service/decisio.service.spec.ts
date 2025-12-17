import { TestBed } from '@angular/core/testing';

import { DecisioService } from './decisio.service';

describe('DecisioService', () => {
  let service: DecisioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DecisioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
