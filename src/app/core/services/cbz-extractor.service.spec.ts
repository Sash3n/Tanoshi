import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CbzExtractorService } from './cbz-extractor.service';
import JSZip from 'jszip';

/** Minimal 1x1 transparent PNG as a byte array for test archives. */
const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

describe('CbzExtractorService', () => {
  let service: CbzExtractorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CbzExtractorService);

    // Stub URL.createObjectURL since jsdom does not implement it
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);

    // Stub the private cover-generation method to avoid Image/canvas in jsdom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(service, 'resizeImageToBase64')
      .mockResolvedValue('data:image/jpeg;base64,mockcover');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('extractFromBuffer', () => {
    it('should return zero pages for an empty zip archive', async () => {
      const zip = new JSZip();
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });

      const result = await service.extractFromBuffer(buffer);

      expect(result.pageCount).toBe(0);
      expect(result.pages).toHaveLength(0);
      expect(result.coverImageBase64).toBeNull();
    });

    it('should extract image files sorted alphabetically by filename', async () => {
      const zip = new JSZip();
      zip.file('003.png', TINY_PNG);
      zip.file('001.png', TINY_PNG);
      zip.file('002.png', TINY_PNG);
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });

      const result = await service.extractFromBuffer(buffer);

      expect(result.pageCount).toBe(3);
      expect(result.pages[0].fileName).toBe('001.png');
      expect(result.pages[1].fileName).toBe('002.png');
      expect(result.pages[2].fileName).toBe('003.png');
    });

    it('should ignore non-image files inside the archive', async () => {
      const zip = new JSZip();
      zip.file('001.png', TINY_PNG);
      zip.file('metadata.xml', '<ComicInfo/>');
      zip.file('Thumbs.db', new Uint8Array([0x00]));
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });

      const result = await service.extractFromBuffer(buffer);

      expect(result.pageCount).toBe(1);
    });

    it('should sort numerically so page 10 comes after page 9', async () => {
      const zip = new JSZip();
      zip.file('page-9.png', TINY_PNG);
      zip.file('page-10.png', TINY_PNG);
      zip.file('page-2.png', TINY_PNG);
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });

      const result = await service.extractFromBuffer(buffer);

      expect(result.pages[0].fileName).toBe('page-2.png');
      expect(result.pages[1].fileName).toBe('page-9.png');
      expect(result.pages[2].fileName).toBe('page-10.png');
    });
  });
});
