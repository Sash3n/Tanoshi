import type { ISeries } from '../../domain/models/series.model';
import type { IChapter } from '../../domain/models/chapter.model';
import type { IReadingProgress } from '../../domain/models/reading-progress.model';
import type { IBookmark } from '../../domain/models/bookmark.model';
import type { ITag } from '../../domain/models/tag.model';
import type { ICollection } from '../../domain/models/collection.model';
import { FileFormat } from '../../domain/enums/file-format.enum';

/** The full shape written to and read from exported backup files. */
export interface IBackupPayload {
  readonly version: number;
  readonly exportedAt: string;
  readonly series: ISeries[];
  readonly chapters: IChapter[];
  readonly readingProgress: IReadingProgress[];
  readonly bookmarks: IBookmark[];
  readonly tags: ITag[];
  readonly collections: ICollection[];
}

/**
 * Every parse function below explicitly reads known fields off the raw input
 * rather than spreading it, so unexpected or malicious extra keys (e.g.
 * `__proto__`) in an imported file are never copied onto the resulting
 * object.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid backup data: expected non-empty string for "${field}"`);
  }
  return value;
}

function requireOptionalString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requireString(value, field);
}

function requireOptionalNumber(value: unknown, field: string): number | null {
  if (value === null) return null;
  return requireNumber(value, field);
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid backup data: expected finite number for "${field}"`);
  }
  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid backup data: expected boolean for "${field}"`);
  }
  return value;
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`Invalid backup data: expected string[] for "${field}"`);
  }
  return value;
}

function requireDate(value: unknown, field: string): Date {
  if (typeof value !== 'string') {
    throw new Error(`Invalid backup data: expected ISO date string for "${field}"`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid backup data: unparseable date for "${field}"`);
  }
  return date;
}

function requireFileFormat(value: unknown, field: string): FileFormat {
  const validValues = Object.values(FileFormat) as string[];
  if (typeof value !== 'string' || !validValues.includes(value)) {
    throw new Error(`Invalid backup data: unrecognised file format for "${field}"`);
  }
  return value as FileFormat;
}

function parseArray<T>(
  value: unknown,
  field: string,
  parseItem: (item: unknown, index: number) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid backup data: expected an array for "${field}"`);
  }
  return value.map((item, index) => parseItem(item, index));
}

function parseSeries(raw: unknown): ISeries {
  if (!isPlainObject(raw)) throw new Error('Invalid backup data: series entry is not an object');
  return {
    id: requireString(raw.id, 'series.id'),
    title: requireString(raw.title, 'series.title'),
    alternativeTitles: requireStringArray(raw.alternativeTitles, 'series.alternativeTitles'),
    coverImageBase64: requireOptionalString(raw.coverImageBase64, 'series.coverImageBase64'),
    totalChapterCount: requireNumber(raw.totalChapterCount, 'series.totalChapterCount'),
    fileFormat: requireFileFormat(raw.fileFormat, 'series.fileFormat'),
    localFilePath: requireString(raw.localFilePath, 'series.localFilePath'),
    anilistId: requireOptionalNumber(raw.anilistId, 'series.anilistId'),
    mangaDexId: requireOptionalString(raw.mangaDexId, 'series.mangaDexId'),
    genres: requireStringArray(raw.genres, 'series.genres'),
    synopsis: requireOptionalString(raw.synopsis, 'series.synopsis'),
    author: requireOptionalString(raw.author, 'series.author'),
    artist: requireOptionalString(raw.artist, 'series.artist'),
    isFavorite: requireBoolean(raw.isFavorite, 'series.isFavorite'),
    tagIds: requireStringArray(raw.tagIds, 'series.tagIds'),
    createdAt: requireDate(raw.createdAt, 'series.createdAt'),
    updatedAt: requireDate(raw.updatedAt, 'series.updatedAt'),
  };
}

function parseChapter(raw: unknown): IChapter {
  if (!isPlainObject(raw)) throw new Error('Invalid backup data: chapter entry is not an object');
  return {
    id: requireString(raw.id, 'chapter.id'),
    seriesId: requireString(raw.seriesId, 'chapter.seriesId'),
    chapterNumber: requireNumber(raw.chapterNumber, 'chapter.chapterNumber'),
    volumeNumber: requireOptionalNumber(raw.volumeNumber, 'chapter.volumeNumber'),
    title: requireOptionalString(raw.title, 'chapter.title'),
    localFilePath: requireString(raw.localFilePath, 'chapter.localFilePath'),
    pageCount: requireNumber(raw.pageCount, 'chapter.pageCount'),
    fileSizeBytes: requireNumber(raw.fileSizeBytes, 'chapter.fileSizeBytes'),
    importedAt: requireDate(raw.importedAt, 'chapter.importedAt'),
  };
}

function parseReadingProgress(raw: unknown): IReadingProgress {
  if (!isPlainObject(raw)) throw new Error('Invalid backup data: readingProgress entry is not an object');
  return {
    id: requireString(raw.id, 'readingProgress.id'),
    chapterId: requireString(raw.chapterId, 'readingProgress.chapterId'),
    seriesId: requireString(raw.seriesId, 'readingProgress.seriesId'),
    currentPageIndex: requireNumber(raw.currentPageIndex, 'readingProgress.currentPageIndex'),
    totalPageCount: requireNumber(raw.totalPageCount, 'readingProgress.totalPageCount'),
    isCompleted: requireBoolean(raw.isCompleted, 'readingProgress.isCompleted'),
    lastReadAt: requireDate(raw.lastReadAt, 'readingProgress.lastReadAt'),
    readingDurationSeconds: requireNumber(raw.readingDurationSeconds, 'readingProgress.readingDurationSeconds'),
  };
}

function parseBookmark(raw: unknown): IBookmark {
  if (!isPlainObject(raw)) throw new Error('Invalid backup data: bookmark entry is not an object');
  return {
    id: requireString(raw.id, 'bookmark.id'),
    chapterId: requireString(raw.chapterId, 'bookmark.chapterId'),
    seriesId: requireString(raw.seriesId, 'bookmark.seriesId'),
    pageIndex: requireNumber(raw.pageIndex, 'bookmark.pageIndex'),
    note: requireOptionalString(raw.note, 'bookmark.note'),
    createdAt: requireDate(raw.createdAt, 'bookmark.createdAt'),
  };
}

function parseTag(raw: unknown): ITag {
  if (!isPlainObject(raw)) throw new Error('Invalid backup data: tag entry is not an object');
  return {
    id: requireString(raw.id, 'tag.id'),
    name: requireString(raw.name, 'tag.name'),
    color: requireString(raw.color, 'tag.color'),
    createdAt: requireDate(raw.createdAt, 'tag.createdAt'),
  };
}

function parseCollection(raw: unknown): ICollection {
  if (!isPlainObject(raw)) throw new Error('Invalid backup data: collection entry is not an object');
  return {
    id: requireString(raw.id, 'collection.id'),
    name: requireString(raw.name, 'collection.name'),
    seriesIds: requireStringArray(raw.seriesIds, 'collection.seriesIds'),
    createdAt: requireDate(raw.createdAt, 'collection.createdAt'),
    updatedAt: requireDate(raw.updatedAt, 'collection.updatedAt'),
  };
}

/**
 * Parses and validates a raw, untrusted JSON value into a typed backup
 * payload. Throws a descriptive error on the first structural problem found
 * rather than silently dropping or coercing bad records.
 */
export function parseBackupPayload(raw: unknown, supportedVersion: number): IBackupPayload {
  if (!isPlainObject(raw)) {
    throw new Error('Invalid backup data: root value is not an object');
  }

  const version = requireNumber(raw.version, 'version');
  if (version !== supportedVersion) {
    throw new Error(`Unsupported backup version ${version} (expected ${supportedVersion})`);
  }

  return {
    version,
    exportedAt: requireString(raw.exportedAt, 'exportedAt'),
    series: parseArray(raw.series, 'series', parseSeries),
    chapters: parseArray(raw.chapters, 'chapters', parseChapter),
    readingProgress: parseArray(raw.readingProgress, 'readingProgress', parseReadingProgress),
    bookmarks: parseArray(raw.bookmarks, 'bookmarks', parseBookmark),
    tags: parseArray(raw.tags, 'tags', parseTag),
    collections: parseArray(raw.collections, 'collections', parseCollection),
  };
}
