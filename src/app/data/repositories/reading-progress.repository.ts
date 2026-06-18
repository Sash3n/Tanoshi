import { Injectable } from '@angular/core';
import { tanoshiDb } from '../database/tanoshi-db';
import type { IReadingProgress } from '../../domain/models/reading-progress.model';

/** Provides all CRUD operations for the readingProgress table. */
@Injectable({ providedIn: 'root' })
export class ReadingProgressRepository {
  /** Returns the reading progress record for a specific chapter, or undefined. */
  async getByChapterId(chapterId: string): Promise<IReadingProgress | undefined> {
    return tanoshiDb.readingProgress.where('chapterId').equals(chapterId).first();
  }

  /** Returns all progress records for a series, ordered by lastReadAt descending. */
  async getBySeriesId(seriesId: string): Promise<IReadingProgress[]> {
    const records = await tanoshiDb.readingProgress
      .where('seriesId')
      .equals(seriesId)
      .toArray();
    return records.sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime());
  }

  /** Returns all progress records across all series, ordered by lastReadAt descending. */
  async getAll(): Promise<IReadingProgress[]> {
    const records = await tanoshiDb.readingProgress.toArray();
    return records.sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime());
  }

  /**
   * Creates or updates the progress record for a chapter (upsert by chapterId).
   * Wrapped in a read-write transaction to prevent duplicate rows from concurrent saves.
   */
  async upsert(progressData: Omit<IReadingProgress, 'id'> & { id?: string }): Promise<void> {
    await tanoshiDb.transaction('rw', tanoshiDb.readingProgress, async () => {
      const existing = await tanoshiDb.readingProgress
        .where('chapterId')
        .equals(progressData.chapterId)
        .first();
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tanoshiDb.readingProgress.update(existing.id, progressData as any);
      } else {
        await tanoshiDb.readingProgress.add({
          ...progressData,
          id: crypto.randomUUID(),
        } as IReadingProgress);
      }
    });
  }

  /** Deletes all progress records for a series. */
  async deleteBySeriesId(seriesId: string): Promise<void> {
    await tanoshiDb.readingProgress.where('seriesId').equals(seriesId).delete();
  }
}
