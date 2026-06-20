import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CollectionRepository } from './collection.repository';
import { tanoshiDb } from '../database/tanoshi-db';

describe('CollectionRepository', () => {
  let repository: CollectionRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(CollectionRepository);
  });

  afterEach(async () => {
    await tanoshiDb.collections.clear();
  });

  it('should create an empty collection', async () => {
    const id = await repository.create('Favorites Shelf');
    const collection = await repository.getById(id);

    expect(collection?.name).toBe('Favorites Shelf');
    expect(collection?.seriesIds).toEqual([]);
  });

  it('should add a series id to a collection', async () => {
    const id = await repository.create('Shelf');
    await repository.addSeries(id, 'series-1');

    const collection = await repository.getById(id);
    expect(collection?.seriesIds).toEqual(['series-1']);
  });

  it('should not add a duplicate series id', async () => {
    const id = await repository.create('Shelf');
    await repository.addSeries(id, 'series-1');
    await repository.addSeries(id, 'series-1');

    const collection = await repository.getById(id);
    expect(collection?.seriesIds).toEqual(['series-1']);
  });

  it('should remove a series id from a collection', async () => {
    const id = await repository.create('Shelf');
    await repository.addSeries(id, 'series-1');
    await repository.removeSeries(id, 'series-1');

    const collection = await repository.getById(id);
    expect(collection?.seriesIds).toEqual([]);
  });

  it('should no-op when adding to a non-existent collection', async () => {
    await expect(repository.addSeries('missing-id', 'series-1')).resolves.toBeUndefined();
  });

  it('should delete a collection', async () => {
    const id = await repository.create('Shelf');
    await repository.delete(id);

    const collection = await repository.getById(id);
    expect(collection).toBeUndefined();
  });
});
