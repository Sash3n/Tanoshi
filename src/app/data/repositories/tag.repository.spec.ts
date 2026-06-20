import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TagRepository } from './tag.repository';
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
    tagIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('TagRepository', () => {
  let repository: TagRepository;
  let seriesRepository: SeriesRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(TagRepository);
    seriesRepository = TestBed.inject(SeriesRepository);
  });

  afterEach(async () => {
    await tanoshiDb.tags.clear();
    await tanoshiDb.series.clear();
  });

  it('should create and retrieve a tag', async () => {
    const id = await repository.create('Shonen', '#e3b341');
    const tag = await repository.getById(id);

    expect(tag?.name).toBe('Shonen');
    expect(tag?.color).toBe('#e3b341');
  });

  it('should throw when creating a tag with a duplicate name', async () => {
    await repository.create('Shonen', '#e3b341');
    await expect(repository.create('Shonen', '#ffffff')).rejects.toThrow();
  });

  it('should return all tags', async () => {
    await repository.create('Shonen', '#e3b341');
    await repository.create('Seinen', '#5b8def');

    const tags = await repository.getAll();

    expect(tags).toHaveLength(2);
  });

  it('should delete a tag and remove its id from every series referencing it', async () => {
    const tagId = await repository.create('Shonen', '#e3b341');
    const seriesId = await seriesRepository.create(buildSeries({ tagIds: [tagId] }));

    await repository.delete(tagId);

    const tag = await repository.getById(tagId);
    const series = await seriesRepository.getById(seriesId);

    expect(tag).toBeUndefined();
    expect(series?.tagIds).toEqual([]);
  });
});
