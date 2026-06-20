import { Injectable, inject, signal, computed } from '@angular/core';
import { LibraryService, type IImportProgress } from '../../../core/services/library.service';
import { ReadingProgressRepository } from '../../../data/repositories/reading-progress.repository';
import { LIBRARY_SORT_OPTIONS, type LibrarySortOption } from '../../../core/constants/library.constants';
import type { ISeries } from '../../../domain/models/series.model';
import type { IReadingProgress } from '../../../domain/models/reading-progress.model';

/**
 * Signal-based store for the library feature.
 * All reactive state is exposed as readonly signals.
 */
@Injectable({ providedIn: 'root' })
export class LibraryStore {
  readonly #libraryService = inject(LibraryService);
  readonly #progressRepository = inject(ReadingProgressRepository);

  /** The full list of imported series, ordered by creation date descending. */
  readonly seriesList = signal<ISeries[]>([]);

  /** All reading progress records, used to derive recently-read and unread-count sorting. */
  readonly progressList = signal<IReadingProgress[]>([]);

  /** True while the library is being loaded or a file is being imported. */
  readonly isLoading = signal<boolean>(false);

  /** Non-null when the last operation produced an error. */
  readonly errorMessage = signal<string | null>(null);

  /** Progress state for the currently importing file, null when idle. */
  readonly importProgress = signal<IImportProgress | null>(null);

  /** True when the library has been loaded and contains no series. */
  readonly isEmpty = computed(() => !this.isLoading() && this.seriesList().length === 0);

  /** Total number of series in the library. */
  readonly seriesCount = computed(() => this.seriesList().length);

  /** Current search query (empty string means no filter). */
  readonly searchQuery = signal<string>('');

  /** When true, only favorited series are shown. */
  readonly favoritesOnly = signal<boolean>(false);

  /** When non-null, only series carrying this tag id are shown. */
  readonly activeTagId = signal<string | null>(null);

  /** Active sort applied after search/favorite/tag filtering. */
  readonly sortOption = signal<LibrarySortOption>('recentlyAdded');

  /** Series filtered by search query, favorites-only, and active tag. */
  readonly filteredSeries = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const onlyFavorites = this.favoritesOnly();
    const tagId = this.activeTagId();

    return this.seriesList().filter((s) => {
      if (query && !s.title.toLowerCase().includes(query)) return false;
      if (onlyFavorites && !s.isFavorite) return false;
      if (tagId && !s.tagIds.includes(tagId)) return false;
      return true;
    });
  });

  /** Most recent lastReadAt per series id, derived from progressList. */
  readonly #lastReadAtBySeriesId = computed(() => {
    const map = new Map<string, number>();
    for (const progress of this.progressList()) {
      const existing = map.get(progress.seriesId) ?? 0;
      const candidate = progress.lastReadAt.getTime();
      if (candidate > existing) map.set(progress.seriesId, candidate);
    }
    return map;
  });

  /** Count of incomplete chapters per series id, derived from progressList. */
  readonly #unreadCountBySeriesId = computed(() => {
    const completedBySeriesId = new Map<string, number>();
    for (const progress of this.progressList()) {
      if (!progress.isCompleted) continue;
      completedBySeriesId.set(progress.seriesId, (completedBySeriesId.get(progress.seriesId) ?? 0) + 1);
    }
    return new Map(
      this.seriesList().map((s) => [s.id, s.totalChapterCount - (completedBySeriesId.get(s.id) ?? 0)]),
    );
  });

  /**
   * Filtered series sorted by the active sort option, with favorites always
   * surfaced first within the sort.
   */
  readonly sortedSeries = computed(() => {
    const sort = this.sortOption();
    const lastReadAt = this.#lastReadAtBySeriesId();
    const unreadCount = this.#unreadCountBySeriesId();

    const comparator = (a: ISeries, b: ISeries): number => {
      switch (sort) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recentlyRead':
          return (lastReadAt.get(b.id) ?? 0) - (lastReadAt.get(a.id) ?? 0);
        case 'unreadCount':
          return (unreadCount.get(b.id) ?? 0) - (unreadCount.get(a.id) ?? 0);
        case 'recentlyAdded':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    };

    return [...this.filteredSeries()].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return comparator(a, b);
    });
  });

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setFavoritesOnly(value: boolean): void {
    this.favoritesOnly.set(value);
  }

  setActiveTagId(tagId: string | null): void {
    this.activeTagId.set(tagId);
  }

  /** Cycles to the next sort option in LIBRARY_SORT_OPTIONS order. */
  cycleSortOption(): void {
    const currentIndex = LIBRARY_SORT_OPTIONS.indexOf(this.sortOption());
    this.sortOption.set(LIBRARY_SORT_OPTIONS[(currentIndex + 1) % LIBRARY_SORT_OPTIONS.length]);
  }

  /**
   * Loads all series and reading progress from the database into the store.
   * Call this on library page init.
   */
  async loadLibrary(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [allSeries, allProgress] = await Promise.all([
        this.#libraryService.getAllSeries(),
        this.#progressRepository.getAll(),
      ]);
      this.seriesList.set(allSeries);
      this.progressList.set(allProgress);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to load library');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Imports a file picked by the user and refreshes the library list.
   * @param file The File object from the browser file input.
   */
  async importFile(file: File): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.importProgress.set(null);
    try {
      await this.#libraryService.importFile(file, (progress) => {
        this.importProgress.set(progress);
      });
      await this.loadLibrary();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Import failed');
    } finally {
      this.isLoading.set(false);
      this.importProgress.set(null);
    }
  }

  /**
   * Flips a series' favorite flag and updates it in place in the loaded list.
   * @param seriesId The id of the series to toggle.
   */
  async toggleFavorite(seriesId: string): Promise<void> {
    const nextValue = await this.#libraryService.toggleFavorite(seriesId);
    this.seriesList.update((currentList) =>
      currentList.map((s) => (s.id === seriesId ? { ...s, isFavorite: nextValue } : s)),
    );
  }

  /**
   * Deletes a series and all its chapters, then refreshes the list.
   * @param seriesId The id of the series to remove.
   */
  async deleteSeries(seriesId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.#libraryService.deleteSeries(seriesId);
      this.seriesList.update((currentList) => currentList.filter((s) => s.id !== seriesId));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to delete series');
    } finally {
      this.isLoading.set(false);
    }
  }
}
