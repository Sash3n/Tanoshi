import { Component, inject, signal, OnInit, afterNextRender, Injector } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Star } from 'lucide-angular';
import { SeriesRepository } from '../../../../data/repositories/series.repository';
import { ChapterRepository } from '../../../../data/repositories/chapter.repository';
import { ReadingProgressRepository } from '../../../../data/repositories/reading-progress.repository';
import { BookmarkRepository } from '../../../../data/repositories/bookmark.repository';
import { MetadataService } from '../../../../core/services/metadata.service';
import { ChapterListComponent } from '../../components/chapter-list/chapter-list.component';
import { SeriesMetadataCardComponent } from '../../components/series-metadata-card/series-metadata-card.component';
import { BookmarksListComponent } from '../../components/bookmarks-list/bookmarks-list.component';
import type { ISeries } from '../../../../domain/models/series.model';
import type { IChapter } from '../../../../domain/models/chapter.model';
import type { IReadingProgress } from '../../../../domain/models/reading-progress.model';
import type { IBookmark } from '../../../../domain/models/bookmark.model';
import type { ISeriesMetadata } from '../../../../domain/models/metadata.model';

@Component({
  selector: 'app-series-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    ChapterListComponent,
    SeriesMetadataCardComponent,
    BookmarksListComponent,
  ],
  templateUrl: './series-detail-page.component.html',
})
export class SeriesDetailPageComponent implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #seriesRepository = inject(SeriesRepository);
  readonly #chapterRepository = inject(ChapterRepository);
  readonly #progressRepository = inject(ReadingProgressRepository);
  readonly #bookmarkRepository = inject(BookmarkRepository);
  readonly #metadataService = inject(MetadataService);
  readonly #injector = inject(Injector);

  protected readonly series = signal<ISeries | null>(null);
  protected readonly chapters = signal<IChapter[]>([]);
  protected readonly progressList = signal<IReadingProgress[]>([]);
  protected readonly bookmarks = signal<IBookmark[]>([]);
  protected readonly metadata = signal<ISeriesMetadata | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly starIcon = Star;

  async ngOnInit(): Promise<void> {
    const seriesId = this.#route.snapshot.paramMap.get('id');
    if (!seriesId) {
      await this.#router.navigate(['/library']);
      return;
    }

    const [seriesData, chaptersData, progressData, bookmarksData] = await Promise.all([
      this.#seriesRepository.getById(seriesId),
      this.#chapterRepository.getBySeriesId(seriesId),
      this.#progressRepository.getBySeriesId(seriesId),
      this.#bookmarkRepository.getBySeriesId(seriesId),
    ]);

    if (!seriesData) {
      await this.#router.navigate(['/library']);
      return;
    }

    this.series.set(seriesData);
    this.chapters.set(chaptersData);
    this.progressList.set(progressData);
    this.bookmarks.set(bookmarksData);
    this.isLoading.set(false);

    afterNextRender(() => {
      this.#scrollToFirstUnread(chaptersData, progressData);
    }, { injector: this.#injector });

    void this.#metadataService.fetchMetadata(seriesData.title).then((fetchedMetadata) => {
      this.metadata.set(fetchedMetadata);
    });
  }

  protected async onToggleFavorite(): Promise<void> {
    const current = this.series();
    if (!current) return;
    const nextValue = await this.#seriesRepository.toggleFavorite(current.id);
    this.series.set({ ...current, isFavorite: nextValue });
  }

  protected async onRemoveBookmark(bookmarkId: string): Promise<void> {
    await this.#bookmarkRepository.delete(bookmarkId);
    this.bookmarks.update((list) => list.filter((b) => b.id !== bookmarkId));
  }

  #scrollToFirstUnread(chapters: IChapter[], progressList: IReadingProgress[]): void {
    const completedIds = new Set(progressList.filter((p) => p.isCompleted).map((p) => p.chapterId));
    const firstUnread = chapters.find((c) => !completedIds.has(c.id));
    if (!firstUnread) return;
    document
      .querySelector(`[data-chapter-id="${firstUnread.id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
