import { Injectable, inject } from '@angular/core';
import { SeriesRepository } from '../../data/repositories/series.repository';
import { ChapterRepository } from '../../data/repositories/chapter.repository';
import { ReadingProgressRepository } from '../../data/repositories/reading-progress.repository';
import { BookmarkRepository } from '../../data/repositories/bookmark.repository';
import { TagRepository } from '../../data/repositories/tag.repository';
import { CollectionRepository } from '../../data/repositories/collection.repository';
import { tanoshiDb } from '../../data/database/tanoshi-db';
import { BACKUP_FORMAT_VERSION, MAX_BACKUP_FILE_SIZE_BYTES } from '../constants/backup.constants';
import { parseBackupPayload, type IBackupPayload } from './backup-validation';

/**
 * Exports the full local database (series, chapters, progress, bookmarks,
 * tags, collections) to a single JSON file, and restores it back.
 *
 * Imported manga page images are never included — only metadata is backed
 * up, since the original CBZ/CBR/PDF files live outside the database and
 * must be re-imported by the user.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  readonly #seriesRepository = inject(SeriesRepository);
  readonly #chapterRepository = inject(ChapterRepository);
  readonly #progressRepository = inject(ReadingProgressRepository);
  readonly #bookmarkRepository = inject(BookmarkRepository);
  readonly #tagRepository = inject(TagRepository);
  readonly #collectionRepository = inject(CollectionRepository);

  /** Gathers every table into a single JSON-serialisable backup payload. */
  async buildExportPayload(): Promise<IBackupPayload> {
    const [series, chapters, readingProgress, bookmarks, tags, collections] = await Promise.all([
      this.#seriesRepository.getAll(),
      this.#chapterRepository.getAll(),
      this.#progressRepository.getAll(),
      this.#bookmarkRepository.getAll(),
      this.#tagRepository.getAll(),
      this.#collectionRepository.getAll(),
    ]);

    return {
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      series,
      chapters,
      readingProgress,
      bookmarks,
      tags,
      collections,
    };
  }

  /**
   * Validates and parses a backup file's text content. Rejects the file
   * outright (without parsing) if it exceeds MAX_BACKUP_FILE_SIZE_BYTES.
   */
  parseBackupFile(file: File, fileText: string): IBackupPayload {
    if (file.size > MAX_BACKUP_FILE_SIZE_BYTES) {
      throw new Error(
        `Backup file is too large (${Math.round(file.size / 1024 / 1024)}MB). ` +
          `Maximum supported size is ${MAX_BACKUP_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(fileText);
    } catch {
      throw new Error('Backup file is not valid JSON.');
    }

    return parseBackupPayload(raw, BACKUP_FORMAT_VERSION);
  }

  /**
   * Replaces every table's contents with the given backup payload inside a
   * single transaction, so a failure partway through leaves the existing
   * data untouched rather than half-restored.
   */
  async restoreFromPayload(payload: IBackupPayload): Promise<void> {
    await tanoshiDb.transaction(
      'rw',
      [
        tanoshiDb.series,
        tanoshiDb.chapters,
        tanoshiDb.readingProgress,
        tanoshiDb.bookmarks,
        tanoshiDb.tags,
        tanoshiDb.collections,
      ],
      async () => {
        await Promise.all([
          tanoshiDb.series.clear(),
          tanoshiDb.chapters.clear(),
          tanoshiDb.readingProgress.clear(),
          tanoshiDb.bookmarks.clear(),
          tanoshiDb.tags.clear(),
          tanoshiDb.collections.clear(),
        ]);
        await Promise.all([
          tanoshiDb.series.bulkAdd(payload.series),
          tanoshiDb.chapters.bulkAdd(payload.chapters),
          tanoshiDb.readingProgress.bulkAdd(payload.readingProgress),
          tanoshiDb.bookmarks.bulkAdd(payload.bookmarks),
          tanoshiDb.tags.bulkAdd(payload.tags),
          tanoshiDb.collections.bulkAdd(payload.collections),
        ]);
      },
    );
  }
}
