import Dexie, { type Table } from 'dexie';
import type { ISeries } from '../../domain/models/series.model';
import type { IChapter } from '../../domain/models/chapter.model';
import type { IReadingProgress } from '../../domain/models/reading-progress.model';
import type { IBookmark } from '../../domain/models/bookmark.model';
import { DB_NAME } from '../../core/constants/storage.constants';

export interface IMetadataCache {
  readonly id: string;
  readonly url: string;
  readonly responseBody: string;
  readonly cachedAt: Date;
}

export class TanoshiDatabase extends Dexie {
  readonly series!: Table<ISeries, string>;
  readonly chapters!: Table<IChapter, string>;
  readonly readingProgress!: Table<IReadingProgress, string>;
  readonly metadataCache!: Table<IMetadataCache, string>;
  readonly bookmarks!: Table<IBookmark, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      series:          '++id, title, anilistId, mangaDexId, createdAt',
      chapters:        '++id, seriesId, chapterNumber, volumeNumber',
      readingProgress: '++id, chapterId, seriesId, lastReadAt, isCompleted',
    });
    this.version(2).stores({
      series:          '++id, title, anilistId, mangaDexId, createdAt',
      chapters:        '++id, seriesId, chapterNumber, volumeNumber',
      readingProgress: '++id, chapterId, seriesId, lastReadAt, isCompleted',
      metadataCache:   '++id, url, cachedAt',
    });
    // v3: enforce uniqueness on metadataCache.url and readingProgress.chapterId
    // to prevent duplicate rows from concurrent writes
    this.version(3).stores({
      series:          '++id, title, anilistId, mangaDexId, createdAt',
      chapters:        '++id, seriesId, chapterNumber, volumeNumber',
      readingProgress: '++id, &chapterId, seriesId, lastReadAt, isCompleted',
      metadataCache:   '++id, &url, cachedAt',
    });
    // v4: favorites and per-page bookmarks.
    // isFavorite is not indexed — boolean is not a valid IndexedDB key type,
    // so favorites are filtered in-memory in SeriesRepository.getFavorites().
    this.version(4).stores({
      series:          '++id, title, anilistId, mangaDexId, createdAt',
      chapters:        '++id, seriesId, chapterNumber, volumeNumber',
      readingProgress: '++id, &chapterId, seriesId, lastReadAt, isCompleted',
      metadataCache:   '++id, &url, cachedAt',
      bookmarks:       '++id, chapterId, seriesId, createdAt',
    }).upgrade(async (tx) => {
      // Existing series predate the isFavorite field — default them to false
      // so the new index has a defined value for every row.
      await tx.table('series').toCollection().modify({ isFavorite: false });
    });
  }
}

export const tanoshiDb = new TanoshiDatabase();
