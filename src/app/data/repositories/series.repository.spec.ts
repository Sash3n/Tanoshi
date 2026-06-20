import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SeriesRepository } from './series.repository';
import { tanoshiDb } from '../database/tanoshi-db';
import { FileFormat } from '../../domain/enums/file-format.enum';
import type { ISeries } from '../../domain/models/series.model';

function buildSeries(overrides: Partial<ISeries> = {}): Omit<ISeries, 'id'> {
  const now = new Date();
  return {
    title: 'Test Series',
    alternativeTitles: [],
    coverImageBase64: null,
    totalChapterCount: 1,
    fileFormat: FileFormat.CBZ,
    localFilePath: '/test/series.cbz',
    anilistId: null,
    mangaDexId: null,
    genres: [],
    synopsis: null,
    author: null,
    artist: null,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('SeriesRepository', () => {
  let repository: SeriesRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(SeriesRepository);
  });

  afterEach(async () => {
    await tanoshiDb.series.clear();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should create and retrieve a series by id', async () => {
    const newId = await repository.create(buildSeries({ title: 'My Manga' }));
    const retrievedSeries = await repository.getById(newId);

    expect(retrievedSeries).toBeDefined();
    expect(retrievedSeries?.title).toBe('My Manga');
    expect(retrievedSeries?.id).toBe(newId);
  });

  it('should return undefined for a non-existent id', async () => {
    const retrievedSeries = await repository.getById('non-existent-id');
    expect(retrievedSeries).toBeUndefined();
  });

  it('should return all series ordered by createdAt descending', async () => {
    const now = Date.now();
    await repository.create(buildSeries({ title: 'First', createdAt: new Date(now - 2000) }));
    await repository.create(buildSeries({ title: 'Second', createdAt: new Date(now - 1000) }));
    await repository.create(buildSeries({ title: 'Third', createdAt: new Date(now) }));

    const allSeries = await repository.getAll();

    expect(allSeries).toHaveLength(3);
    expect(allSeries[0].title).toBe('Third');
    expect(allSeries[2].title).toBe('First');
  });

  it('should update specific fields on an existing series', async () => {
    const newId = await repository.create(buildSeries({ synopsis: null }));
    await repository.update(newId, { synopsis: 'An exciting story' });

    const updatedSeries = await repository.getById(newId);
    expect(updatedSeries?.synopsis).toBe('An exciting story');
  });

  it('should delete a series and return undefined on subsequent lookup', async () => {
    const newId = await repository.create(buildSeries());
    await repository.delete(newId);

    const deletedSeries = await repository.getById(newId);
    expect(deletedSeries).toBeUndefined();
  });
});
