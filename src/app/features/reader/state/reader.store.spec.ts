import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReaderStore } from './reader.store';
import { ReadingMode } from '../../../domain/enums/reading-mode.enum';
import type { IChapter } from '../../../domain/models/chapter.model';

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
import {
  TAP_ZONE_LEFT_THRESHOLD,
  TAP_ZONE_RIGHT_THRESHOLD,
  PROGRESS_SAVE_INTERVAL_PAGES,
  DEFAULT_PRELOAD_PAGES_AHEAD,
  DEFAULT_PRELOAD_PAGES_BEHIND,
} from '../../../core/constants/reader.constants';

describe('ReaderStore', () => {
  let store: ReaderStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ReaderStore);
  });

  // ── Tap zone logic ────────────────────────────────────────────────────────

  describe('resolveTapAction', () => {
    it('should return "next" for a tap in the left third', () => {
      expect(store.resolveTapAction(0.0)).toBe('next');
      expect(store.resolveTapAction(TAP_ZONE_LEFT_THRESHOLD - 0.01)).toBe('next');
    });

    it('should return "previous" for a tap in the right third', () => {
      expect(store.resolveTapAction(1.0)).toBe('previous');
      expect(store.resolveTapAction(TAP_ZONE_RIGHT_THRESHOLD + 0.01)).toBe('previous');
    });

    it('should return "toggle-controls" for a tap in the centre zone', () => {
      expect(store.resolveTapAction(0.5)).toBe('toggle-controls');
      expect(store.resolveTapAction(TAP_ZONE_LEFT_THRESHOLD)).toBe('toggle-controls');
      expect(store.resolveTapAction(TAP_ZONE_RIGHT_THRESHOLD)).toBe('toggle-controls');
    });
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

  // ── Progress save interval ────────────────────────────────────────────────

  describe('progress save interval', () => {
    it('should save progress after PROGRESS_SAVE_INTERVAL_PAGES page turns', async () => {
      store.totalPageCount.set(20);
      store.currentPageIndex.set(0);
      store.lastSavedPageIndex.set(0);
      // Must have a chapter set so #saveProgress does not return early
      store.currentChapter.set(MOCK_CHAPTER);

      // Navigate just under the save threshold — lastSaved should stay at 0
      for (let i = 0; i < PROGRESS_SAVE_INTERVAL_PAGES - 1; i++) {
        store.goToNextPage();
      }
      expect(store.lastSavedPageIndex()).toBe(0);

      // One more page crosses the threshold and triggers the async save
      store.goToNextPage();
      // Wait for the async #saveProgress (includes Dexie upsert) to complete
      await vi.waitFor(() => {
        expect(store.lastSavedPageIndex()).toBe(PROGRESS_SAVE_INTERVAL_PAGES);
      }, { timeout: 2000 });
    });
  });

  // ── Preload range ─────────────────────────────────────────────────────────

  describe('getPreloadRange', () => {
    it('should return the correct range centred on the current page', () => {
      store.totalPageCount.set(20);
      store.currentPageIndex.set(5);

      const range = store.getPreloadRange();

      expect(range.start).toBe(5 - DEFAULT_PRELOAD_PAGES_BEHIND);
      expect(range.end).toBe(5 + DEFAULT_PRELOAD_PAGES_AHEAD);
    });

    it('should clamp start at 0 for early pages', () => {
      store.totalPageCount.set(20);
      store.currentPageIndex.set(0);

      const range = store.getPreloadRange();
      expect(range.start).toBe(0);
    });

    it('should clamp end at totalPageCount - 1 for the last pages', () => {
      store.totalPageCount.set(5);
      store.currentPageIndex.set(4);

      const range = store.getPreloadRange();
      expect(range.end).toBe(4);
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
});
