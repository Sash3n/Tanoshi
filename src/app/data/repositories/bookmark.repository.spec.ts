import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BookmarkRepository } from './bookmark.repository';
import { tanoshiDb } from '../database/tanoshi-db';
import type { IBookmark } from '../../domain/models/bookmark.model';

function buildBookmark(overrides: Partial<IBookmark> = {}): Omit<IBookmark, 'id'> {
  return {
    chapterId: 'ch-1',
    seriesId: 'series-1',
    pageIndex: 0,
    note: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('BookmarkRepository', () => {
  let repository: BookmarkRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(BookmarkRepository);
  });

  afterEach(async () => {
    await tanoshiDb.bookmarks.clear();
  });

  it('should create and retrieve bookmarks for a chapter sorted by page index', async () => {
    await repository.create(buildBookmark({ pageIndex: 12 }));
    await repository.create(buildBookmark({ pageIndex: 3 }));
    await repository.create(buildBookmark({ pageIndex: 7 }));

    const bookmarks = await repository.getByChapterId('ch-1');

    expect(bookmarks.map((b) => b.pageIndex)).toEqual([3, 7, 12]);
  });

  it('should scope getByChapterId to the requested chapter only', async () => {
    await repository.create(buildBookmark({ chapterId: 'ch-1' }));
    await repository.create(buildBookmark({ chapterId: 'ch-2' }));

    const bookmarks = await repository.getByChapterId('ch-1');

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].chapterId).toBe('ch-1');
  });

  it('should return all bookmarks for a series across chapters, newest first', async () => {
    const now = Date.now();
    await repository.create(buildBookmark({
      seriesId: 's-1', chapterId: 'ch-1', createdAt: new Date(now - 1000),
    }));
    await repository.create(buildBookmark({
      seriesId: 's-1', chapterId: 'ch-2', createdAt: new Date(now),
    }));
    await repository.create(buildBookmark({ seriesId: 's-2', chapterId: 'ch-3' }));

    const bookmarks = await repository.getBySeriesId('s-1');

    expect(bookmarks).toHaveLength(2);
    expect(bookmarks[0].chapterId).toBe('ch-2');
  });

  it('should delete a bookmark', async () => {
    const id = await repository.create(buildBookmark());
    await repository.delete(id);

    const remaining = await repository.getByChapterId('ch-1');
    expect(remaining).toHaveLength(0);
  });
});
