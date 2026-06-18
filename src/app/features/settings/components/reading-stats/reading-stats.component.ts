import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { LucideAngularModule, BookOpen, CheckCircle, Library, Clock } from 'lucide-angular';
import { ReadingProgressRepository } from '../../../../data/repositories/reading-progress.repository';

interface IStats {
  readonly totalPagesRead: number;
  readonly chaptersCompleted: number;
  readonly seriesStarted: number;
  readonly estimatedHours: number;
}

const AVG_SECONDS_PER_PAGE = 12;

@Component({
  selector: 'app-reading-stats',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './reading-stats.component.html',
})
export class ReadingStatsComponent implements OnInit {
  readonly #progressRepository = inject(ReadingProgressRepository);

  protected readonly stats = signal<IStats | null>(null);

  protected readonly bookIcon = BookOpen;
  protected readonly checkIcon = CheckCircle;
  protected readonly libraryIcon = Library;
  protected readonly clockIcon = Clock;

  protected readonly statCards = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { icon: this.bookIcon,    value: s.totalPagesRead.toLocaleString(), label: 'Pages read'         },
      { icon: this.checkIcon,   value: String(s.chaptersCompleted),       label: 'Chapters done'       },
      { icon: this.libraryIcon, value: String(s.seriesStarted),           label: 'Series started'      },
      { icon: this.clockIcon,   value: `${s.estimatedHours}h`,            label: 'Est. reading time'   },
    ];
  });

  async ngOnInit(): Promise<void> {
    const allProgress = await this.#progressRepository.getAll();

    const totalPagesRead = allProgress.reduce((sum, p) => sum + p.currentPageIndex, 0);
    const chaptersCompleted = allProgress.filter((p) => p.isCompleted).length;
    const seriesStarted = new Set(allProgress.map((p) => p.seriesId)).size;
    const estimatedHours = Math.round((totalPagesRead * AVG_SECONDS_PER_PAGE) / 3600);

    this.stats.set({ totalPagesRead, chaptersCompleted, seriesStarted, estimatedHours });
  }
}
