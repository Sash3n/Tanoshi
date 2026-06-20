import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LibraryStore } from './library.store';
import { LibraryService } from '../../../core/services/library.service';
import { ReadingProgressRepository } from '../../../data/repositories/reading-progress.repository';
import { FileFormat } from '../../../domain/enums/file-format.enum';
import type { ISeries } from '../../../domain/models/series.model';
import type { IReadingProgress } from '../../../domain/models/reading-progress.model';

function buildSeries(overrides: Partial<ISeries> = {}): ISeries {
  const now = new Date();
  return {
    id: 's1',
    title: 'Series',
    alternativeTitles: [],
    coverImageBase64: null,
    totalChapterCount: 10,
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

function buildProgress(overrides: Partial<IReadingProgress> = {}): IReadingProgress {
  return {
    id: 'p1',
    chapterId: 'ch1',
    seriesId: 's1',
    currentPageIndex: 0,
    totalPageCount: 20,
    isCompleted: false,
    lastReadAt: new Date(),
    readingDurationSeconds: 0,
    ...overrides,
  };
}

describe('LibraryStore', () => {
  let store: LibraryStore;
  let libraryService: LibraryService;
  let progressRepository: ReadingProgressRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(LibraryStore);
    libraryService = TestBed.inject(LibraryService);
    progressRepository = TestBed.inject(ReadingProgressRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('filteredSeries', () => {
    it('should filter by search query case-insensitively', async () => {
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1', title: 'One Punch Man' }),
        buildSeries({ id: 's2', title: 'Naruto' }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([]);
      await store.loadLibrary();

      store.setSearchQuery('punch');

      expect(store.filteredSeries().map((s) => s.id)).toEqual(['s1']);
    });

    it('should filter to favorites only when favoritesOnly is set', async () => {
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1', isFavorite: true }),
        buildSeries({ id: 's2', isFavorite: false }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([]);
      await store.loadLibrary();

      store.setFavoritesOnly(true);

      expect(store.filteredSeries().map((s) => s.id)).toEqual(['s1']);
    });

    it('should filter by active tag id', async () => {
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1', tagIds: ['tag-1'] }),
        buildSeries({ id: 's2', tagIds: [] }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([]);
      await store.loadLibrary();

      store.setActiveTagId('tag-1');

      expect(store.filteredSeries().map((s) => s.id)).toEqual(['s1']);
    });
  });

  describe('sortedSeries', () => {
    it('should always surface favorites first regardless of sort option', async () => {
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1', title: 'Zebra', isFavorite: false }),
        buildSeries({ id: 's2', title: 'Apple', isFavorite: true }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([]);
      await store.loadLibrary();

      store.sortOption.set('title');

      expect(store.sortedSeries().map((s) => s.id)).toEqual(['s2', 's1']);
    });

    it('should sort by title alphabetically within the same favorite group', async () => {
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1', title: 'Zebra' }),
        buildSeries({ id: 's2', title: 'Apple' }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([]);
      await store.loadLibrary();

      store.sortOption.set('title');

      expect(store.sortedSeries().map((s) => s.id)).toEqual(['s2', 's1']);
    });

    it('should sort by most recently added by default', async () => {
      const now = Date.now();
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1', createdAt: new Date(now - 2000) }),
        buildSeries({ id: 's2', createdAt: new Date(now) }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([]);
      await store.loadLibrary();

      expect(store.sortedSeries().map((s) => s.id)).toEqual(['s2', 's1']);
    });

    it('should sort by most recently read using the latest progress per series', async () => {
      const now = Date.now();
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1' }),
        buildSeries({ id: 's2' }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([
        buildProgress({ seriesId: 's1', lastReadAt: new Date(now - 5000) }),
        buildProgress({ seriesId: 's2', lastReadAt: new Date(now) }),
      ]);
      await store.loadLibrary();

      store.sortOption.set('recentlyRead');

      expect(store.sortedSeries().map((s) => s.id)).toEqual(['s2', 's1']);
    });

    it('should sort series with no reading progress last when sorting by recently read', async () => {
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1' }),
        buildSeries({ id: 's2' }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([
        buildProgress({ seriesId: 's2', lastReadAt: new Date() }),
      ]);
      await store.loadLibrary();

      store.sortOption.set('recentlyRead');

      expect(store.sortedSeries().map((s) => s.id)).toEqual(['s2', 's1']);
    });

    it('should sort by unread count descending', async () => {
      vi.spyOn(libraryService, 'getAllSeries').mockResolvedValue([
        buildSeries({ id: 's1', totalChapterCount: 10 }),
        buildSeries({ id: 's2', totalChapterCount: 10 }),
      ]);
      vi.spyOn(progressRepository, 'getAll').mockResolvedValue([
        // s1 has 8 completed chapters -> 2 unread; s2 has none completed -> 10 unread
        ...Array.from({ length: 8 }, (_, i) =>
          buildProgress({ id: `p-${i}`, chapterId: `ch-${i}`, seriesId: 's1', isCompleted: true }),
        ),
      ]);
      await store.loadLibrary();

      store.sortOption.set('unreadCount');

      expect(store.sortedSeries().map((s) => s.id)).toEqual(['s2', 's1']);
    });
  });

  describe('cycleSortOption', () => {
    it('should advance through LIBRARY_SORT_OPTIONS and wrap around', () => {
      expect(store.sortOption()).toBe('recentlyAdded');
      store.cycleSortOption();
      expect(store.sortOption()).toBe('recentlyRead');
      store.cycleSortOption();
      expect(store.sortOption()).toBe('title');
      store.cycleSortOption();
      expect(store.sortOption()).toBe('unreadCount');
      store.cycleSortOption();
      expect(store.sortOption()).toBe('recentlyAdded');
    });
  });
});
