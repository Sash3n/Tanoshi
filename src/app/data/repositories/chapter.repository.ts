import { Injectable } from '@angular/core';
import { tanoshiDb } from '../database/tanoshi-db';
import type { IChapter } from '../../domain/models/chapter.model';

/** Provides all CRUD operations for the chapters table. */
@Injectable({ providedIn: 'root' })
export class ChapterRepository {
  /** Returns every chapter in the database. */
  async getAll(): Promise<IChapter[]> {
    return tanoshiDb.chapters.toArray();
  }

  /** Returns all chapters belonging to a series, sorted by chapter number ascending. */
  async getBySeriesId(seriesId: string): Promise<IChapter[]> {
    return tanoshiDb.chapters
      .where('seriesId')
      .equals(seriesId)
      .sortBy('chapterNumber');
  }

  /** Returns a single chapter by its id, or undefined if not found. */
  async getById(chapterId: string): Promise<IChapter | undefined> {
    return tanoshiDb.chapters.get(chapterId);
  }

  /** Inserts a new chapter record and returns the generated id. */
  async create(chapterData: Omit<IChapter, 'id'>): Promise<string> {
    return tanoshiDb.chapters.add({ ...chapterData, id: crypto.randomUUID() } as IChapter) as Promise<string>;
  }

  /** Updates fields on an existing chapter record. */
  async update(chapterId: string, changes: Partial<IChapter>): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tanoshiDb.chapters.update(chapterId, changes as any);
  }

  /** Deletes a chapter record. */
  async delete(chapterId: string): Promise<void> {
    await tanoshiDb.chapters.delete(chapterId);
  }

  /** Deletes all chapters belonging to a series. */
  async deleteBySeriesId(seriesId: string): Promise<void> {
    await tanoshiDb.chapters.where('seriesId').equals(seriesId).delete();
  }
}
