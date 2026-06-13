import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { SeriesRepository } from '../../../../data/repositories/series.repository';
import { ChapterRepository } from '../../../../data/repositories/chapter.repository';
import { ReadingProgressRepository } from '../../../../data/repositories/reading-progress.repository';
import { MetadataService } from '../../../../core/services/metadata.service';
import { ChapterListComponent } from '../../components/chapter-list/chapter-list.component';
import { SeriesMetadataCardComponent } from '../../components/series-metadata-card/series-metadata-card.component';
import type { ISeries } from '../../../../domain/models/series.model';
import type { IChapter } from '../../../../domain/models/chapter.model';
import type { IReadingProgress } from '../../../../domain/models/reading-progress.model';
import type { ISeriesMetadata } from '../../../../domain/models/metadata.model';

@Component({
  selector: 'app-series-detail-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, ChapterListComponent, SeriesMetadataCardComponent],
  templateUrl: './series-detail-page.component.html',
})
export class SeriesDetailPageComponent implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #seriesRepository = inject(SeriesRepository);
  readonly #chapterRepository = inject(ChapterRepository);
  readonly #progressRepository = inject(ReadingProgressRepository);
  readonly #metadataService = inject(MetadataService);

  /** The series being viewed, null while loading. */
  protected readonly series = signal<ISeries | null>(null);

  /** Chapters sorted ascending by chapter number. */
  protected readonly chapters = signal<IChapter[]>([]);

  /** Reading progress for all chapters of this series. */
  protected readonly progressList = signal<IReadingProgress[]>([]);

  /** Metadata from AniList or MangaDex, null while fetching or if unavailable. */
  protected readonly metadata = signal<ISeriesMetadata | null>(null);

  /** True while the page is loading initial data. */
  protected readonly isLoading = signal(true);

  protected readonly arrowLeftIcon = ArrowLeft;

  async ngOnInit(): Promise<void> {
    const seriesId = this.#route.snapshot.paramMap.get('id');
    if (!seriesId) {
      await this.#router.navigate(['/library']);
      return;
    }

    const [seriesData, chaptersData, progressData] = await Promise.all([
      this.#seriesRepository.getById(seriesId),
      this.#chapterRepository.getBySeriesId(seriesId),
      this.#progressRepository.getBySeriesId(seriesId),
    ]);

    if (!seriesData) {
      await this.#router.navigate(['/library']);
      return;
    }

    this.series.set(seriesData);
    this.chapters.set(chaptersData);
    this.progressList.set(progressData);
    this.isLoading.set(false);

    // Fetch metadata in the background without blocking render
    void this.#metadataService.fetchMetadata(seriesData.title).then((fetchedMetadata) => {
      this.metadata.set(fetchedMetadata);
    });
  }
}
