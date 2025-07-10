import { TestBed } from '@angular/core/testing';

import { CommandTracker } from './command-tracker';

describe('CommandTracker', () => {
  let service: CommandTracker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommandTracker);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
