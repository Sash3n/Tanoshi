import Dexie, { type Table } from 'dexie';
import type { ISeries } from '../../domain/models/series.model';
import type { IChapter } from '../../domain/models/chapter.model';
import type { IReadingProgress } from '../../domain/models/reading-progress.model';
import { DB_NAME, DB_VERSION } from '../../core/constants/storage.constants';

export class TanoshiDatabase extends Dexie {
  readonly series!: Table<ISeries, string>;
  readonly chapters!: Table<IChapter, string>;
  readonly readingProgress!: Table<IReadingProgress, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      series:          '++id, title, anilistId, mangaDexId, createdAt',
      chapters:        '++id, seriesId, chapterNumber, volumeNumber',
      readingProgress: '++id, chapterId, seriesId, lastReadAt, isCompleted',
    });
  }
}

export const tanoshiDb = new TanoshiDatabase();
