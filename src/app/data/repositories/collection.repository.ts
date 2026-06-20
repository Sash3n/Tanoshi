import { Injectable } from '@angular/core';
import { tanoshiDb } from '../database/tanoshi-db';
import type { ICollection } from '../../domain/models/collection.model';

/** Provides all CRUD operations for the collections table. */
@Injectable({ providedIn: 'root' })
export class CollectionRepository {
  /** Returns all collections ordered by creation date ascending. */
  async getAll(): Promise<ICollection[]> {
    return tanoshiDb.collections.orderBy('createdAt').toArray();
  }

  /** Returns a single collection by its id, or undefined if not found. */
  async getById(collectionId: string): Promise<ICollection | undefined> {
    return tanoshiDb.collections.get(collectionId);
  }

  /** Creates a new empty collection and returns its generated id. */
  async create(name: string): Promise<string> {
    const now = new Date();
    return tanoshiDb.collections.add({
      id: crypto.randomUUID(),
      name,
      seriesIds: [],
      createdAt: now,
      updatedAt: now,
    }) as Promise<string>;
  }

  /** Deletes a collection by id. */
  async delete(collectionId: string): Promise<void> {
    await tanoshiDb.collections.delete(collectionId);
  }

  /**
   * Adds a series id to a collection if not already present.
   * No-ops if the collection does not exist.
   */
  async addSeries(collectionId: string, seriesId: string): Promise<void> {
    await tanoshiDb.transaction('rw', tanoshiDb.collections, async () => {
      const collection = await tanoshiDb.collections.get(collectionId);
      if (!collection || collection.seriesIds.includes(seriesId)) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tanoshiDb.collections.update(collectionId, {
        seriesIds: [...collection.seriesIds, seriesId],
        updatedAt: new Date(),
      } as any);
    });
  }

  /** Removes a series id from a collection. No-ops if the collection does not exist. */
  async removeSeries(collectionId: string, seriesId: string): Promise<void> {
    await tanoshiDb.transaction('rw', tanoshiDb.collections, async () => {
      const collection = await tanoshiDb.collections.get(collectionId);
      if (!collection) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tanoshiDb.collections.update(collectionId, {
        seriesIds: collection.seriesIds.filter((id) => id !== seriesId),
        updatedAt: new Date(),
      } as any);
    });
  }
}
