import { Injectable } from '@angular/core';
import { tanoshiDb } from '../database/tanoshi-db';
import type { IBookmark } from '../../domain/models/bookmark.model';

/** Provides all CRUD operations for the bookmarks table. */
@Injectable({ providedIn: 'root' })
export class BookmarkRepository {
  /** Returns all bookmarks for a chapter, ordered by page index ascending. */
  async getByChapterId(chapterId: string): Promise<IBookmark[]> {
    const records = await tanoshiDb.bookmarks.where('chapterId').equals(chapterId).toArray();
    return records.sort((a, b) => a.pageIndex - b.pageIndex);
  }

  /** Returns all bookmarks for a series across all of its chapters. */
  async getBySeriesId(seriesId: string): Promise<IBookmark[]> {
    const records = await tanoshiDb.bookmarks.where('seriesId').equals(seriesId).toArray();
    return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /** Creates a new bookmark and returns its generated id. */
  async create(bookmarkData: Omit<IBookmark, 'id'>): Promise<string> {
    return tanoshiDb.bookmarks.add({
      ...bookmarkData,
      id: crypto.randomUUID(),
    } as IBookmark) as Promise<string>;
  }

  /** Deletes a bookmark by id. */
  async delete(bookmarkId: string): Promise<void> {
    await tanoshiDb.bookmarks.delete(bookmarkId);
  }
}
