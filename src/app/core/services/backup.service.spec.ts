import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BackupService } from './backup.service';
import { SeriesRepository } from '../../data/repositories/series.repository';
import { tanoshiDb } from '../../data/database/tanoshi-db';
import { FileFormat } from '../../domain/enums/file-format.enum';
import { MAX_BACKUP_FILE_SIZE_BYTES } from '../constants/backup.constants';
import type { ISeries } from '../../domain/models/series.model';

function buildSeries(overrides: Partial<ISeries> = {}): Omit<ISeries, 'id'> {
  const now = new Date();
  return {
    title: 'Test Series',
    alternativeTitles: [],
    coverImageBase64: null,
    totalChapterCount: 1,
    fileFormat: FileFormat.CBZ,
    localFilePath: '/test.cbz',
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

describe('BackupService', () => {
  let service: BackupService;
  let seriesRepository: SeriesRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackupService);
    seriesRepository = TestBed.inject(SeriesRepository);
  });

  afterEach(async () => {
    await Promise.all([
      tanoshiDb.series.clear(),
      tanoshiDb.chapters.clear(),
      tanoshiDb.readingProgress.clear(),
      tanoshiDb.bookmarks.clear(),
      tanoshiDb.tags.clear(),
      tanoshiDb.collections.clear(),
    ]);
  });

  describe('buildExportPayload', () => {
    it('should include all series in the export payload', async () => {
      await seriesRepository.create(buildSeries({ title: 'My Manga' }));

      const payload = await service.buildExportPayload();

      expect(payload.series).toHaveLength(1);
      expect(payload.series[0].title).toBe('My Manga');
      expect(payload.version).toBe(1);
    });
  });

  describe('parseBackupFile', () => {
    it('should reject a file larger than MAX_BACKUP_FILE_SIZE_BYTES', () => {
      const oversizedFile = { size: MAX_BACKUP_FILE_SIZE_BYTES + 1 } as File;
      expect(() => service.parseBackupFile(oversizedFile, '{}')).toThrow(/too large/);
    });

    it('should reject text that is not valid JSON', () => {
      const file = { size: 10 } as File;
      expect(() => service.parseBackupFile(file, 'not json{')).toThrow(/not valid JSON/);
    });

    it('should parse valid backup JSON within the size limit', () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        series: [],
        chapters: [],
        readingProgress: [],
        bookmarks: [],
        tags: [],
        collections: [],
      });
      const file = { size: json.length } as File;

      const result = service.parseBackupFile(file, json);

      expect(result.series).toEqual([]);
    });
  });

  describe('restoreFromPayload', () => {
    it('should replace existing data with the payload contents', async () => {
      await seriesRepository.create(buildSeries({ title: 'Old Series' }));

      const restoredSeries: ISeries = {
        ...buildSeries({ title: 'Restored Series' }),
        id: 'restored-1',
      };

      await service.restoreFromPayload({
        version: 1,
        exportedAt: new Date().toISOString(),
        series: [restoredSeries],
        chapters: [],
        readingProgress: [],
        bookmarks: [],
        tags: [],
        collections: [],
      });

      const allSeries = await seriesRepository.getAll();
      expect(allSeries).toHaveLength(1);
      expect(allSeries[0].title).toBe('Restored Series');
    });

    it('should leave existing data untouched if a bulkAdd fails partway through', async () => {
      await seriesRepository.create(buildSeries({ title: 'Untouched Series' }));

      const duplicateIdSeries: ISeries = { ...buildSeries({ title: 'A' }), id: 'dup-1' };
      const anotherDuplicateIdSeries: ISeries = { ...buildSeries({ title: 'B' }), id: 'dup-1' };

      await expect(
        service.restoreFromPayload({
          version: 1,
          exportedAt: new Date().toISOString(),
          series: [duplicateIdSeries, anotherDuplicateIdSeries],
          chapters: [],
          readingProgress: [],
          bookmarks: [],
          tags: [],
          collections: [],
        }),
      ).rejects.toThrow();

      const allSeries = await seriesRepository.getAll();
      expect(allSeries).toHaveLength(1);
      expect(allSeries[0].title).toBe('Untouched Series');
    });
  });
});
