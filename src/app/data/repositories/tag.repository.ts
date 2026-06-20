import { Injectable } from '@angular/core';
import { tanoshiDb } from '../database/tanoshi-db';
import type { ITag } from '../../domain/models/tag.model';

/** Provides all CRUD operations for the tags table. */
@Injectable({ providedIn: 'root' })
export class TagRepository {
  /** Returns all tags ordered by creation date ascending. */
  async getAll(): Promise<ITag[]> {
    return tanoshiDb.tags.orderBy('createdAt').toArray();
  }

  /** Returns a single tag by its id, or undefined if not found. */
  async getById(tagId: string): Promise<ITag | undefined> {
    return tanoshiDb.tags.get(tagId);
  }

  /**
   * Creates a new tag. Throws if a tag with the same name already exists,
   * since the &name index enforces uniqueness.
   */
  async create(name: string, color: string): Promise<string> {
    return tanoshiDb.tags.add({
      id: crypto.randomUUID(),
      name,
      color,
      createdAt: new Date(),
    }) as Promise<string>;
  }

  /**
   * Deletes a tag and removes its id from every series that references it.
   */
  async delete(tagId: string): Promise<void> {
    await tanoshiDb.transaction('rw', tanoshiDb.tags, tanoshiDb.series, async () => {
      await tanoshiDb.tags.delete(tagId);
      await tanoshiDb.series
        .where('tagIds')
        .equals(tagId)
        .modify((series) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (series as any).tagIds = series.tagIds.filter((id) => id !== tagId);
        });
    });
  }
}
