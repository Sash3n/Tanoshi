import { describe, it, expect } from 'vitest';
import { parseBackupPayload } from './backup-validation';
import { FileFormat } from '../../domain/enums/file-format.enum';

const VALID_SERIES = {
  id: 's1',
  title: 'Test Series',
  alternativeTitles: [],
  coverImageBase64: null,
  totalChapterCount: 1,
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function buildValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    series: [VALID_SERIES],
    chapters: [],
    readingProgress: [],
    bookmarks: [],
    tags: [],
    collections: [],
    ...overrides,
  };
}

describe('parseBackupPayload', () => {
  it('should parse a valid payload', () => {
    const result = parseBackupPayload(buildValidPayload(), 1);

    expect(result.series).toHaveLength(1);
    expect(result.series[0].id).toBe('s1');
    expect(result.series[0].createdAt).toBeInstanceOf(Date);
  });

  it('should reject a non-object root value', () => {
    expect(() => parseBackupPayload('not an object', 1)).toThrow(/root value is not an object/);
    expect(() => parseBackupPayload(null, 1)).toThrow();
    expect(() => parseBackupPayload([1, 2, 3], 1)).toThrow();
  });

  it('should reject a mismatched version', () => {
    expect(() => parseBackupPayload(buildValidPayload({ version: 99 }), 1)).toThrow(/Unsupported backup version/);
  });

  it('should reject when a top-level array field is missing', () => {
    const payload = buildValidPayload();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (payload as any).chapters;
    expect(() => parseBackupPayload(payload, 1)).toThrow(/expected an array for "chapters"/);
  });

  it('should reject a series entry missing a required field', () => {
    const payload = buildValidPayload({
      series: [{ ...VALID_SERIES, title: undefined }],
    });
    expect(() => parseBackupPayload(payload, 1)).toThrow(/series.title/);
  });

  it('should reject a series entry with an invalid fileFormat', () => {
    const payload = buildValidPayload({
      series: [{ ...VALID_SERIES, fileFormat: 'exe' }],
    });
    expect(() => parseBackupPayload(payload, 1)).toThrow(/unrecognised file format/);
  });

  it('should reject a series entry with an unparseable date', () => {
    const payload = buildValidPayload({
      series: [{ ...VALID_SERIES, createdAt: 'not-a-date' }],
    });
    expect(() => parseBackupPayload(payload, 1)).toThrow(/unparseable date/);
  });

  it('should not copy unexpected extra keys onto parsed records', () => {
    const payload = buildValidPayload({
      series: [{ ...VALID_SERIES, __proto__: { polluted: true }, extraField: 'ignored' }],
    });
    const result = parseBackupPayload(payload, 1);

    expect((result.series[0] as Record<string, unknown>)['extraField']).toBeUndefined();
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('should reject a series entry that is not an object', () => {
    const payload = buildValidPayload({ series: ['not-an-object'] });
    expect(() => parseBackupPayload(payload, 1)).toThrow(/series entry is not an object/);
  });

  it('should accept an empty arrays-only payload', () => {
    const payload = buildValidPayload({ series: [] });
    const result = parseBackupPayload(payload, 1);
    expect(result.series).toEqual([]);
  });
});
