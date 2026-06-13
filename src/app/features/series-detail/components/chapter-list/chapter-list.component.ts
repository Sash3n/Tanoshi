import { Component, input, output, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { IChapter } from '../../../../domain/models/chapter.model';
import type { IReadingProgress } from '../../../../domain/models/reading-progress.model';

type ChapterStatus = 'reading' | 'unread' | 'read';

interface IChapterRow {
  readonly chapter: IChapter;
  readonly status: ChapterStatus;
  readonly currentPage: number;
}

@Component({
  selector: 'app-chapter-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './chapter-list.component.html',
})
export class ChapterListComponent {
  /** Chapters sorted by number ascending. */
  readonly chapters = input.required<IChapter[]>();

  /** All reading progress records for this series. */
  readonly progressList = input<IReadingProgress[]>([]);

  /** Emits the chapter id when the user taps a chapter row. */
  readonly chapterSelected = output<string>();

  /** Builds chapter rows with computed status from progress records. */
  readonly chapterRows = computed<IChapterRow[]>(() => {
    const progressMap = new Map(
      this.progressList().map((p) => [p.chapterId, p]),
    );
    return this.chapters().map((chapter) => {
      const progress = progressMap.get(chapter.id);
      let status: ChapterStatus = 'unread';
      if (progress?.isCompleted) status = 'read';
      else if (progress && progress.currentPageIndex > 0) status = 'reading';
      return { chapter, status, currentPage: progress?.currentPageIndex ?? 0 };
    });
  });
}
