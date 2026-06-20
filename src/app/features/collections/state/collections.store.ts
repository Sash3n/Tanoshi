import { Injectable, inject, signal } from '@angular/core';
import { CollectionRepository } from '../../../data/repositories/collection.repository';
import type { ICollection } from '../../../domain/models/collection.model';

/**
 * Signal-based store for the collections feature.
 * All reactive state is exposed as readonly signals.
 */
@Injectable({ providedIn: 'root' })
export class CollectionsStore {
  readonly #collectionRepository = inject(CollectionRepository);

  /** All collections, ordered by creation date ascending. */
  readonly collections = signal<ICollection[]>([]);

  /** True while collections are being loaded. */
  readonly isLoading = signal<boolean>(false);

  /** Non-null when the last operation produced an error. */
  readonly errorMessage = signal<string | null>(null);

  /** Loads all collections from the database into the store. */
  async loadCollections(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      this.collections.set(await this.#collectionRepository.getAll());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to load collections');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Creates a new empty collection and refreshes the list. */
  async createCollection(name: string): Promise<void> {
    await this.#collectionRepository.create(name);
    await this.loadCollections();
  }

  /** Deletes a collection and removes it from the loaded list. */
  async deleteCollection(collectionId: string): Promise<void> {
    await this.#collectionRepository.delete(collectionId);
    this.collections.update((list) => list.filter((c) => c.id !== collectionId));
  }

  /** Adds a series to a collection and updates it in place in the loaded list. */
  async addSeriesToCollection(collectionId: string, seriesId: string): Promise<void> {
    await this.#collectionRepository.addSeries(collectionId, seriesId);
    this.collections.update((list) =>
      list.map((c) =>
        c.id === collectionId && !c.seriesIds.includes(seriesId)
          ? { ...c, seriesIds: [...c.seriesIds, seriesId] }
          : c,
      ),
    );
  }

  /** Removes a series from a collection and updates it in place in the loaded list. */
  async removeSeriesFromCollection(collectionId: string, seriesId: string): Promise<void> {
    await this.#collectionRepository.removeSeries(collectionId, seriesId);
    this.collections.update((list) =>
      list.map((c) =>
        c.id === collectionId
          ? { ...c, seriesIds: c.seriesIds.filter((id) => id !== seriesId) }
          : c,
      ),
    );
  }
}
