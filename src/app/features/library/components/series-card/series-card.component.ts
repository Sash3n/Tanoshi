import { Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ISeries } from '../../../../domain/models/series.model';
import type { IReadingProgress } from '../../../../domain/models/reading-progress.model';

@Component({
  selector: 'app-series-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './series-card.component.html',
})
export class SeriesCardComponent {
  /** The series to display. */
  readonly series = input.required<ISeries>();

  /** Reading progress records for all chapters of this series. */
  readonly progressList = input<IReadingProgress[]>([]);

  /** Percentage of chapters completed (0-100). */
  readonly readPercentage = computed(() => {
    const totalChapterCount = this.series().totalChapterCount;
    if (totalChapterCount === 0) return 0;
    const completedCount = this.progressList().filter((p) => p.isCompleted).length;
    return Math.round((completedCount / totalChapterCount) * 100);
  });

  /** True if at least one chapter has been started but not completed. */
  readonly hasActiveReading = computed(() =>
    this.progressList().some((p) => !p.isCompleted && p.currentPageIndex > 0),
  );
}
