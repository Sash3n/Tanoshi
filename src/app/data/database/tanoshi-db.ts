import Dexie, { type Table } from 'dexie';
import type { ISeries } from '../../domain/models/series.model';
import type { IChapter } from '../../domain/models/chapter.model';
import type { IReadingProgress } from '../../domain/models/reading-progress.model';
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
  }
}

export const tanoshiDb = new TanoshiDatabase();
