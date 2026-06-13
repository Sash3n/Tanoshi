import { Injectable, inject } from '@angular/core';
import { ReadingProgressRepository } from '../../data/repositories/reading-progress.repository';
import { SeriesRepository } from '../../data/repositories/series.repository';
import { ChapterRepository } from '../../data/repositories/chapter.repository';
import type { ISeries } from '../../domain/models/series.model';
import type { IChapter } from '../../domain/models/chapter.model';
import type { IReadingProgress } from '../../domain/models/reading-progress.model';

export interface IContinueReadingEntry {
  readonly series: ISeries;
  readonly chapter: IChapter;
  readonly progress: IReadingProgress;
}

@Injectable({ providedIn: 'root' })
export class ContinueReadingService {
  readonly #progressRepository = inject(ReadingProgressRepository);
  readonly #seriesRepository = inject(SeriesRepository);
  readonly #chapterRepository = inject(ChapterRepository);

  /** Returns the most recently read in-progress chapter, or null if nothing to resume. */
  async getLastRead(): Promise<IContinueReadingEntry | null> {
    const allProgress = await this.#progressRepository.getAll();
    const inProgress = allProgress.find((p) => !p.isCompleted && p.currentPageIndex > 0);
    if (!inProgress) return null;

    const [series, chapter] = await Promise.all([
      this.#seriesRepository.getById(inProgress.seriesId),
      this.#chapterRepository.getById(inProgress.chapterId),
    ]);
    if (!series || !chapter) return null;

    return { series, chapter, progress: inProgress };
  }
}
