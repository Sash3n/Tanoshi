import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReaderStore } from './reader.store';

describe('ReaderStore — comfort mode', () => {
  let store: ReaderStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ReaderStore);
  });

  it('should default to "none" filter', () => {
    expect(store.pageFilter()).toBe('none');
  });

  it('should cycle none → sepia → greyscale → inverted → none', () => {
    expect(store.pageFilter()).toBe('none');
    store.cyclePageFilter();
    expect(store.pageFilter()).toBe('sepia');
    store.cyclePageFilter();
    expect(store.pageFilter()).toBe('greyscale');
    store.cyclePageFilter();
    expect(store.pageFilter()).toBe('inverted');
    store.cyclePageFilter();
    expect(store.pageFilter()).toBe('none');
  });
});
