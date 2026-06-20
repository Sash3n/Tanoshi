import { Injectable } from '@angular/core';
import { tanoshiDb } from '../database/tanoshi-db';
import type { ISeries } from '../../domain/models/series.model';

/** Provides all CRUD operations for the series table. */
@Injectable({ providedIn: 'root' })
export class SeriesRepository {
  /** Returns all series ordered by creation date descending. */
  async getAll(): Promise<ISeries[]> {
    return tanoshiDb.series.orderBy('createdAt').reverse().toArray();
  }

  /** Returns a single series by its id, or undefined if not found. */
  async getById(seriesId: string): Promise<ISeries | undefined> {
    return tanoshiDb.series.get(seriesId);
  }

  /** Inserts a new series record and returns the generated id. */
  async create(seriesData: Omit<ISeries, 'id'>): Promise<string> {
    return tanoshiDb.series.add({ ...seriesData, id: crypto.randomUUID() } as ISeries) as Promise<string>;
  }

  /** Updates fields on an existing series record. */
  async update(seriesId: string, changes: Partial<ISeries>): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tanoshiDb.series.update(seriesId, changes as any);
  }

  /** Deletes a series and returns the number of records removed. */
  async delete(seriesId: string): Promise<void> {
    await tanoshiDb.series.delete(seriesId);
  }

  /** Returns all series flagged as favorites. */
  async getFavorites(): Promise<ISeries[]> {
    return tanoshiDb.series.filter((s) => s.isFavorite).toArray();
  }

  /** Flips a series' favorite flag and returns the new value. */
  async toggleFavorite(seriesId: string): Promise<boolean> {
    return tanoshiDb.transaction('rw', tanoshiDb.series, async () => {
      const series = await tanoshiDb.series.get(seriesId);
      if (!series) throw new Error(`Series ${seriesId} not found`);
      const nextValue = !series.isFavorite;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tanoshiDb.series.update(seriesId, { isFavorite: nextValue } as any);
      return nextValue;
    });
  }
}
