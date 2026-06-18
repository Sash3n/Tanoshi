import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReaderStore } from './reader.store';
import { ReadingMode } from '../../../domain/enums/reading-mode.enum';
import type { IChapter } from '../../../domain/models/chapter.model';
import {
  TAP_ZONE_LEFT_THRESHOLD,
  TAP_ZONE_RIGHT_THRESHOLD,
  PROGRESS_SAVE_INTERVAL_PAGES,
  DEFAULT_PRELOAD_PAGES_AHEAD,
  DEFAULT_PRELOAD_PAGES_BEHIND,
} from '../../../core/constants/reader.constants';
import { ReadingProgressRepository } from '../../../data/repositories/reading-progress.repository';
import { tanoshiDb } from '../../../data/database/tanoshi-db';

const MOCK_CHAPTER: IChapter = {
  id: 'ch-1',
  seriesId: 'series-1',
  chapterNumber: 1,
  volumeNumber: null,
  title: null,
  localFilePath: 'chapter-1.cbz',
  pageCount: 20,
  fileSizeBytes: 1024,
  importedAt: new Date(),
};

describe('ReaderStore', () => {
  let store: ReaderStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ReaderStore);
  });

  afterEach(async () => {
    await tanoshiDb.readingProgress.clear();
  });

  // ── Page navigation ───────────────────────────────────────────────────────

  describe('page navigation', () => {
    beforeEach(() => {
      store.totalPageCount.set(10);
      store.currentPageIndex.set(5);
      store.lastSavedPageIndex.set(5);
    });

    it('should advance the page index on goToNextPage', () => {
      store.goToNextPage();
      expect(store.currentPageIndex()).toBe(6);
    });

    it('should not advance past the last page', () => {
      store.currentPageIndex.set(9);
      store.goToNextPage();
      expect(store.currentPageIndex()).toBe(9);
    });

    it('should decrease the page index on goToPreviousPage', () => {
      store.goToPreviousPage();
      expect(store.currentPageIndex()).toBe(4);
    });

    it('should not go below page 0', () => {
      store.currentPageIndex.set(0);
      store.goToPreviousPage();
      expect(store.currentPageIndex()).toBe(0);
    });

    it('should clamp goToPage within valid range', () => {
      store.goToPage(-5);
      expect(store.currentPageIndex()).toBe(0);

      store.goToPage(999);
      expect(store.currentPageIndex()).toBe(9);

      store.goToPage(3);
      expect(store.currentPageIndex()).toBe(3);
    });
  });

  // ── Tap zone constants ────────────────────────────────────────────────────
  // These verify the zone boundaries the PageViewerComponent relies on.

  describe('tap zone constants', () => {
    it('left threshold is below centre', () => {
      expect(TAP_ZONE_LEFT_THRESHOLD).toBeLessThan(0.5);
    });

    it('right threshold is above centre', () => {
      expect(TAP_ZONE_RIGHT_THRESHOLD).toBeGreaterThan(0.5);
    });

    it('centre zone exists between thresholds', () => {
      expect(TAP_ZONE_LEFT_THRESHOLD).toBeLessThan(TAP_ZONE_RIGHT_THRESHOLD);
    });
  });

  // ── Progress save interval ────────────────────────────────────────────────

  describe('progress save interval', () => {
    it('should save progress after PROGRESS_SAVE_INTERVAL_PAGES page turns', async () => {
      store.totalPageCount.set(20);
      store.currentPageIndex.set(0);
      store.lastSavedPageIndex.set(0);
      store.currentChapter.set(MOCK_CHAPTER);

      for (let i = 0; i < PROGRESS_SAVE_INTERVAL_PAGES - 1; i++) {
        store.goToNextPage();
      }
      expect(store.lastSavedPageIndex()).toBe(0);

      store.goToNextPage();
      await vi.waitFor(() => {
        expect(store.lastSavedPageIndex()).toBe(PROGRESS_SAVE_INTERVAL_PAGES);
      }, { timeout: 2000 });
    });
  });

  // ── Preload range ─────────────────────────────────────────────────────────
  // Preload range logic lives in #maybeSaveProgress — these tests verify
  // the constants driving the range are coherent.

  describe('preload range constants', () => {
    it('DEFAULT_PRELOAD_PAGES_AHEAD should be positive', () => {
      expect(DEFAULT_PRELOAD_PAGES_AHEAD).toBeGreaterThan(0);
    });

    it('DEFAULT_PRELOAD_PAGES_BEHIND should be non-negative', () => {
      expect(DEFAULT_PRELOAD_PAGES_BEHIND).toBeGreaterThanOrEqual(0);
    });

    it('preload window should not exceed 5 pages total', () => {
      expect(DEFAULT_PRELOAD_PAGES_AHEAD + DEFAULT_PRELOAD_PAGES_BEHIND).toBeLessThanOrEqual(5);
    });
  });

  // ── Controls ──────────────────────────────────────────────────────────────

  describe('controls visibility', () => {
    it('should toggle controls on toggleControls', () => {
      expect(store.isControlsVisible()).toBe(false);
      store.toggleControls();
      expect(store.isControlsVisible()).toBe(true);
      store.toggleControls();
      expect(store.isControlsVisible()).toBe(false);
    });

    it('should hide controls on hideControls', () => {
      store.isControlsVisible.set(true);
      store.hideControls();
      expect(store.isControlsVisible()).toBe(false);
    });
  });

  // ── Reading mode ──────────────────────────────────────────────────────────

  describe('reading mode', () => {
    it('should default to PagedRTL', () => {
      expect(store.readingMode()).toBe(ReadingMode.PagedRTL);
    });

    it('should update reading mode on setReadingMode', () => {
      store.setReadingMode(ReadingMode.LongStrip);
      expect(store.readingMode()).toBe(ReadingMode.LongStrip);
      expect(store.isLongStrip()).toBe(true);
    });

    it('should reflect isRightToLeft correctly', () => {
      store.setReadingMode(ReadingMode.PagedRTL);
      expect(store.isRightToLeft()).toBe(true);

      store.setReadingMode(ReadingMode.PagedLTR);
      expect(store.isRightToLeft()).toBe(false);
    });
  });

  // ── Reading progress ──────────────────────────────────────────────────────

  describe('readingProgress computed', () => {
    it('should return 0 when on the first page', () => {
      store.totalPageCount.set(10);
      store.currentPageIndex.set(0);
      expect(store.readingProgress()).toBe(0);
    });

    it('should return 1 when on the last page', () => {
      store.totalPageCount.set(10);
      store.currentPageIndex.set(9);
      expect(store.readingProgress()).toBeCloseTo(1);
    });

    it('should return 0 when totalPageCount is 0', () => {
      store.totalPageCount.set(0);
      expect(store.readingProgress()).toBe(0);
    });
  });

  // ── openChapter while another chapter is open ─────────────────────────────

  describe('openChapter blob URL cleanup', () => {
    it('should revoke existing blob URLs when openChapter is called on a chapter that is already open', async () => {
      // Seed a fake loaded page map with a blob URL
      const fakeUrl = 'blob:fake-url-1';
      const revokespy = vi.spyOn(URL, 'revokeObjectURL');
      store.loadedPages.set(new Map([[0, fakeUrl]]));

      // Calling openChapter should revoke the existing URL before resetting
      // (it will fail to extract from undefined file but the revoke happens first)
      try {
        await store.openChapter('ch-x', new File([], 'empty.cbz'));
      } catch {
        // extraction will fail — that is expected in this unit test
      }

      expect(revokespy).toHaveBeenCalledWith(fakeUrl);
      revokespy.mockRestore();
    });
  });
});
