import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ContinueReadingService } from './continue-reading.service';
import { ReadingProgressRepository } from '../../data/repositories/reading-progress.repository';
import { SeriesRepository } from '../../data/repositories/series.repository';
import { ChapterRepository } from '../../data/repositories/chapter.repository';
import type { IReadingProgress } from '../../domain/models/reading-progress.model';
import type { ISeries } from '../../domain/models/series.model';
import type { IChapter } from '../../domain/models/chapter.model';
import { FileFormat } from '../../domain/enums/file-format.enum';

const NOW = new Date();

const MOCK_SERIES: ISeries = {
  id: 's1', title: 'One Punch Man', alternativeTitles: [], coverImageBase64: null,
  totalChapterCount: 10, fileFormat: FileFormat.CBZ, localFilePath: 'opm.cbz',
  anilistId: null, mangaDexId: null, genres: [], synopsis: null, author: null, artist: null,
  isFavorite: false, createdAt: NOW, updatedAt: NOW,
};

const MOCK_CHAPTER: IChapter = {
  id: 'ch1', seriesId: 's1', chapterNumber: 1, volumeNumber: null, title: null,
  localFilePath: 'ch1.cbz', pageCount: 50, fileSizeBytes: 2048, importedAt: NOW,
};

const IN_PROGRESS: IReadingProgress = {
  id: 'p1', chapterId: 'ch1', seriesId: 's1',
  currentPageIndex: 12, totalPageCount: 50,
  isCompleted: false, lastReadAt: NOW, readingDurationSeconds: 60,
};

const COMPLETED: IReadingProgress = {
  id: 'p2', chapterId: 'ch2', seriesId: 's1',
  currentPageIndex: 49, totalPageCount: 50,
  isCompleted: true, lastReadAt: NOW, readingDurationSeconds: 300,
};

describe('ContinueReadingService', () => {
  let service: ContinueReadingService;
  let progressRepo: ReadingProgressRepository;
  let seriesRepo: SeriesRepository;
  let chapterRepo: ChapterRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContinueReadingService);
    progressRepo = TestBed.inject(ReadingProgressRepository);
    seriesRepo = TestBed.inject(SeriesRepository);
    chapterRepo = TestBed.inject(ChapterRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null when no progress records exist', async () => {
    vi.spyOn(progressRepo, 'getAll').mockResolvedValue([]);
    expect(await service.getLastRead()).toBeNull();
  });

  it('should return null when all chapters are completed', async () => {
    vi.spyOn(progressRepo, 'getAll').mockResolvedValue([COMPLETED]);
    expect(await service.getLastRead()).toBeNull();
  });

  it('should return null when progress is on page 0 (not yet started)', async () => {
    const notStarted: IReadingProgress = { ...IN_PROGRESS, currentPageIndex: 0 };
    vi.spyOn(progressRepo, 'getAll').mockResolvedValue([notStarted]);
    expect(await service.getLastRead()).toBeNull();
  });

  it('should return the in-progress chapter with series and chapter data', async () => {
    vi.spyOn(progressRepo, 'getAll').mockResolvedValue([IN_PROGRESS]);
    vi.spyOn(seriesRepo, 'getById').mockResolvedValue(MOCK_SERIES);
    vi.spyOn(chapterRepo, 'getById').mockResolvedValue(MOCK_CHAPTER);

    const result = await service.getLastRead();

    expect(result).not.toBeNull();
    expect(result!.series.id).toBe('s1');
    expect(result!.chapter.id).toBe('ch1');
    expect(result!.progress.currentPageIndex).toBe(12);
  });

  it('should return the most recently read in-progress chapter when multiple exist', async () => {
    const older: IReadingProgress = {
      ...IN_PROGRESS, id: 'p-old', chapterId: 'ch-old',
      lastReadAt: new Date('2026-06-01'),
    };
    const newer: IReadingProgress = {
      ...IN_PROGRESS, id: 'p-new', chapterId: 'ch-new',
      lastReadAt: new Date('2026-06-10'),
    };
    // getAll() returns sorted desc by lastReadAt — newer first
    vi.spyOn(progressRepo, 'getAll').mockResolvedValue([newer, older]);
    vi.spyOn(seriesRepo, 'getById').mockResolvedValue(MOCK_SERIES);
    vi.spyOn(chapterRepo, 'getById').mockResolvedValue({ ...MOCK_CHAPTER, id: 'ch-new' });

    const result = await service.getLastRead();
    expect(result!.progress.chapterId).toBe('ch-new');
  });

  it('should return null when the series record cannot be found', async () => {
    vi.spyOn(progressRepo, 'getAll').mockResolvedValue([IN_PROGRESS]);
    vi.spyOn(seriesRepo, 'getById').mockResolvedValue(undefined);
    vi.spyOn(chapterRepo, 'getById').mockResolvedValue(MOCK_CHAPTER);
    expect(await service.getLastRead()).toBeNull();
  });

  it('should return null when the chapter record cannot be found', async () => {
    vi.spyOn(progressRepo, 'getAll').mockResolvedValue([IN_PROGRESS]);
    vi.spyOn(seriesRepo, 'getById').mockResolvedValue(MOCK_SERIES);
    vi.spyOn(chapterRepo, 'getById').mockResolvedValue(undefined);
    expect(await service.getLastRead()).toBeNull();
  });
});
