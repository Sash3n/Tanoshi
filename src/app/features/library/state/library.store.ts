import { Injectable, inject, signal, computed } from '@angular/core';
import { LibraryService, type IImportProgress } from '../../../core/services/library.service';
import type { ISeries } from '../../../domain/models/series.model';

/**
 * Signal-based store for the library feature.
 * All reactive state is exposed as readonly signals.
 */
@Injectable({ providedIn: 'root' })
export class LibraryStore {
  readonly #libraryService = inject(LibraryService);

  /** The full list of imported series, ordered by creation date descending. */
  readonly seriesList = signal<ISeries[]>([]);

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

  /**
   * Loads all series from the database into the store.
   * Call this on library page init.
   */
  async loadLibrary(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const allSeries = await this.#libraryService.getAllSeries();
      this.seriesList.set(allSeries);
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
