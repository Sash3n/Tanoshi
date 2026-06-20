import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CollectionsStore } from './collections.store';
import { tanoshiDb } from '../../../data/database/tanoshi-db';

describe('CollectionsStore', () => {
  let store: CollectionsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(CollectionsStore);
  });

  afterEach(async () => {
    await tanoshiDb.collections.clear();
  });

  it('should load an empty list when no collections exist', async () => {
    await store.loadCollections();
    expect(store.collections()).toEqual([]);
  });

  it('should create a collection and reload the list', async () => {
    await store.createCollection('Shelf');

    expect(store.collections()).toHaveLength(1);
    expect(store.collections()[0].name).toBe('Shelf');
  });

  it('should add a series to a collection in place', async () => {
    await store.createCollection('Shelf');
    const collectionId = store.collections()[0].id;

    await store.addSeriesToCollection(collectionId, 'series-1');

    expect(store.collections()[0].seriesIds).toEqual(['series-1']);
  });

  it('should remove a series from a collection in place', async () => {
    await store.createCollection('Shelf');
    const collectionId = store.collections()[0].id;
    await store.addSeriesToCollection(collectionId, 'series-1');

    await store.removeSeriesFromCollection(collectionId, 'series-1');

    expect(store.collections()[0].seriesIds).toEqual([]);
  });

  it('should delete a collection and remove it from the list', async () => {
    await store.createCollection('Shelf');
    const collectionId = store.collections()[0].id;

    await store.deleteCollection(collectionId);

    expect(store.collections()).toEqual([]);
  });
});
