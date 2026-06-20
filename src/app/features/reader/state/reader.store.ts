import { Injectable, inject, signal, computed } from '@angular/core';
import { ReadingMode } from '../../../domain/enums/reading-mode.enum';
import { ReadingDirection } from '../../../domain/enums/reading-direction.enum';
import { ReadingProgressRepository } from '../../../data/repositories/reading-progress.repository';
import { ChapterRepository } from '../../../data/repositories/chapter.repository';
import { BookmarkRepository } from '../../../data/repositories/bookmark.repository';
import { CbzExtractorService } from '../../../core/services/cbz-extractor.service';
import type { IChapter } from '../../../domain/models/chapter.model';
import type { IBookmark } from '../../../domain/models/bookmark.model';
import {
  DEFAULT_READING_MODE,
  DEFAULT_PRELOAD_PAGES_AHEAD,
  DEFAULT_PRELOAD_PAGES_BEHIND,
  PROGRESS_SAVE_INTERVAL_PAGES,
  PAGE_FILTERS,
  type PageFilter,
} from '../../../core/constants/reader.constants';

/** A loaded page ready for display. */
export interface ILoadedPage {
  readonly index: number;
  readonly blobUrl: string;
}

/**
 * Signal store for the manga reader.
 * Manages page navigation, reading mode, controls visibility, preload buffer, and progress persistence.
 */
@Injectable({ providedIn: 'root' })
export class ReaderStore {
  readonly #progressRepository = inject(ReadingProgressRepository);
  readonly #chapterRepository = inject(ChapterRepository);
  readonly #bookmarkRepository = inject(BookmarkRepository);
  readonly #cbzExtractor = inject(CbzExtractorService);

  /** The chapter currently open in the reader. */
  readonly currentChapter = signal<IChapter | null>(null);

  /** Zero-based index of the page currently displayed. */
  readonly currentPageIndex = signal<number>(0);

  /** Total number of pages in the current chapter. */
  readonly totalPageCount = signal<number>(0);

  /** Current reading mode (paged RTL, paged LTR, or long strip). */
  readonly readingMode = signal<ReadingMode>(DEFAULT_READING_MODE);

  /** Whether the controls overlay is visible. */
  readonly isControlsVisible = signal<boolean>(false);

  /** All fully-loaded page blob URLs, keyed by page index. */
  readonly loadedPages = signal<Map<number, string>>(new Map());

  /** True while the chapter is being opened and initial pages are loading. */
  readonly isLoading = signal<boolean>(false);

  /** Non-null when an error has occurred during chapter load. */
  readonly errorMessage = signal<string | null>(null);

  /** The page index at which progress was last saved. */
  readonly lastSavedPageIndex = signal<number>(0);

  /** Active visual filter applied to page images. */
  readonly pageFilter = signal<PageFilter>('none');

  /** Bookmarks for the chapter currently open. */
  readonly bookmarks = signal<IBookmark[]>([]);

  /** True when the page currently displayed has a bookmark. */
  readonly isCurrentPageBookmarked = computed(() =>
    this.bookmarks().some((b) => b.pageIndex === this.currentPageIndex()),
  );

  /** The blob URL for the currently displayed page, or null if not yet loaded. */
  readonly currentPageBlobUrl = computed(() => {
    return this.loadedPages().get(this.currentPageIndex()) ?? null;
  });

  /** Reading progress as a 0–1 fraction. */
  readonly readingProgress = computed(() => {
    const total = this.totalPageCount();
    if (total === 0) return 0;
    return this.currentPageIndex() / (total - 1);
  });

  /** True when the reader is in right-to-left mode. */
  readonly isRightToLeft = computed(() =>
    this.readingMode() === ReadingMode.PagedRTL,
  );

  /** True when in long-strip (vertical scroll) mode. */
  readonly isLongStrip = computed(() =>
    this.readingMode() === ReadingMode.LongStrip,
  );

  /**
   * Opens a chapter by id, extracts pages, and initialises reader state.
   * @param chapterId Id of the chapter to open.
   * @param sourceFile The File object for the CBZ — provided by the calling component.
   */
  async openChapter(chapterId: string, sourceFile: File): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    // Revoke any blob URLs from a previously open chapter before discarding the map
    this.loadedPages().forEach((url) => URL.revokeObjectURL(url));
    this.loadedPages.set(new Map());
    this.currentPageIndex.set(0);

    const chapter = await this.#chapterRepository.getById(chapterId);
    if (!chapter) {
      this.errorMessage.set('Chapter not found.');
      this.isLoading.set(false);
      return;
    }
    this.currentChapter.set(chapter);
    this.bookmarks.set(await this.#bookmarkRepository.getByChapterId(chapterId));

    const savedProgress = await this.#progressRepository.getByChapterId(chapterId);
    const startPage = savedProgress?.currentPageIndex ?? 0;

    try {
      const extraction = await this.#cbzExtractor.extractFromFile(sourceFile);
      this.totalPageCount.set(extraction.pageCount);
      this.currentPageIndex.set(startPage < extraction.pageCount ? startPage : 0);
      this.lastSavedPageIndex.set(this.currentPageIndex());

      const initialPageMap = new Map<number, string>();
      extraction.pages.forEach((page) => {
        initialPageMap.set(page.index, page.blobUrl);
      });
      this.loadedPages.set(initialPageMap);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to open chapter',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Advances to the next page, respecting reading direction.
   * In RTL mode "next" means decreasing visual index (right-to-left).
   */
  goToNextPage(): void {
    const current = this.currentPageIndex();
    const total = this.totalPageCount();
    if (current < total - 1) {
      this.currentPageIndex.set(current + 1);
      this.#maybeSaveProgress();
    }
  }

  /**
   * Goes back to the previous page.
   */
  goToPreviousPage(): void {
    const current = this.currentPageIndex();
    if (current > 0) {
      this.currentPageIndex.set(current - 1);
      this.#maybeSaveProgress();
    }
  }

  /**
   * Jumps directly to a specific page index (0-based).
   * @param pageIndex The target page index.
   */
  goToPage(pageIndex: number): void {
    const total = this.totalPageCount();
    const clamped = Math.max(0, Math.min(pageIndex, total - 1));
    this.currentPageIndex.set(clamped);
    this.#maybeSaveProgress();
  }

  /** Toggles the reader controls overlay visibility. */
  toggleControls(): void {
    this.isControlsVisible.update((visible) => !visible);
  }

  /** Hides the controls overlay. */
  hideControls(): void {
    this.isControlsVisible.set(false);
  }

  /**
   * Changes the active reading mode.
   * @param mode The new reading mode to apply.
   */
  setReadingMode(mode: ReadingMode): void {
    this.readingMode.set(mode);
  }

  /**
   * Saves progress immediately and releases all blob URLs.
   * Call this when the user exits the reader or the app is backgrounded.
   */
  async closeChapter(): Promise<void> {
    await this.#saveProgress(true);
    this.loadedPages().forEach((url) => URL.revokeObjectURL(url));
    this.loadedPages.set(new Map());
    this.currentChapter.set(null);
    this.bookmarks.set([]);
  }

  /**
   * Toggles a bookmark on the current page: removes it if one exists,
   * otherwise creates one.
   */
  async toggleBookmark(): Promise<void> {
    const chapter = this.currentChapter();
    if (!chapter) return;

    const pageIndex = this.currentPageIndex();
    const existing = this.bookmarks().find((b) => b.pageIndex === pageIndex);

    if (existing) {
      await this.#bookmarkRepository.delete(existing.id);
      this.bookmarks.update((list) => list.filter((b) => b.id !== existing.id));
      return;
    }

    const newId = await this.#bookmarkRepository.create({
      chapterId: chapter.id,
      seriesId: chapter.seriesId,
      pageIndex,
      note: null,
      createdAt: new Date(),
    });
    this.bookmarks.update((list) => [
      ...list,
      { id: newId, chapterId: chapter.id, seriesId: chapter.seriesId, pageIndex, note: null, createdAt: new Date() },
    ]);
  }

  /** Cycles through page filter modes: none → sepia → greyscale → inverted → none. */
  cyclePageFilter(): void {
    const current = this.pageFilter();
    const next = PAGE_FILTERS[(PAGE_FILTERS.indexOf(current) + 1) % PAGE_FILTERS.length];
    this.pageFilter.set(next);
  }

  #maybeSaveProgress(): void {
    const current = this.currentPageIndex();
    const lastSaved = this.lastSavedPageIndex();
    if (Math.abs(current - lastSaved) >= PROGRESS_SAVE_INTERVAL_PAGES) {
      void this.#saveProgress(false);
    }
  }

  async #saveProgress(markCompleted: boolean): Promise<void> {
    const chapter = this.currentChapter();
    if (!chapter) return;

    const currentPage = this.currentPageIndex();
    const totalPages = this.totalPageCount();
    const isCompleted = markCompleted || currentPage >= totalPages - 1;

    await this.#progressRepository.upsert({
      chapterId: chapter.id,
      seriesId: chapter.seriesId,
      currentPageIndex: currentPage,
      totalPageCount: totalPages,
      isCompleted,
      lastReadAt: new Date(),
      readingDurationSeconds: 0,
    });

    this.lastSavedPageIndex.set(currentPage);
  }
}
