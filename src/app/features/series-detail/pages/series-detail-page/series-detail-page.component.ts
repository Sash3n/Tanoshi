import { Component, inject, signal, OnInit, afterNextRender, Injector } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Star, FolderHeart, Check } from 'lucide-angular';
import { SeriesRepository } from '../../../../data/repositories/series.repository';
import { ChapterRepository } from '../../../../data/repositories/chapter.repository';
import { ReadingProgressRepository } from '../../../../data/repositories/reading-progress.repository';
import { BookmarkRepository } from '../../../../data/repositories/bookmark.repository';
import { TagRepository } from '../../../../data/repositories/tag.repository';
import { MetadataService } from '../../../../core/services/metadata.service';
import { TAG_COLOR_PALETTE } from '../../../../core/constants/tag.constants';
import { CollectionsStore } from '../../../collections/state/collections.store';
import { ChapterListComponent } from '../../components/chapter-list/chapter-list.component';
import { SeriesMetadataCardComponent } from '../../components/series-metadata-card/series-metadata-card.component';
import { BookmarksListComponent } from '../../components/bookmarks-list/bookmarks-list.component';
import { TagChipsComponent } from '../../components/tag-chips/tag-chips.component';
import type { ISeries } from '../../../../domain/models/series.model';
import type { IChapter } from '../../../../domain/models/chapter.model';
import type { IReadingProgress } from '../../../../domain/models/reading-progress.model';
import type { IBookmark } from '../../../../domain/models/bookmark.model';
import type { ITag } from '../../../../domain/models/tag.model';
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
    TagChipsComponent,
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
  readonly #tagRepository = inject(TagRepository);
  readonly #metadataService = inject(MetadataService);
  readonly #injector = inject(Injector);
  protected readonly collectionsStore = inject(CollectionsStore);

  protected readonly series = signal<ISeries | null>(null);
  protected readonly chapters = signal<IChapter[]>([]);
  protected readonly progressList = signal<IReadingProgress[]>([]);
  protected readonly bookmarks = signal<IBookmark[]>([]);
  protected readonly allTags = signal<ITag[]>([]);
  protected readonly metadata = signal<ISeriesMetadata | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isCollectionMenuOpen = signal(false);
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly starIcon = Star;
  protected readonly folderIcon = FolderHeart;
  protected readonly checkIcon = Check;

  async ngOnInit(): Promise<void> {
    const seriesId = this.#route.snapshot.paramMap.get('id');
    if (!seriesId) {
      await this.#router.navigate(['/library']);
      return;
    }

    const [seriesData, chaptersData, progressData, bookmarksData, tagsData] = await Promise.all([
      this.#seriesRepository.getById(seriesId),
      this.#chapterRepository.getBySeriesId(seriesId),
      this.#progressRepository.getBySeriesId(seriesId),
      this.#bookmarkRepository.getBySeriesId(seriesId),
      this.#tagRepository.getAll(),
      this.collectionsStore.loadCollections(),
    ]);

    if (!seriesData) {
      await this.#router.navigate(['/library']);
      return;
    }

    this.series.set(seriesData);
    this.chapters.set(chaptersData);
    this.progressList.set(progressData);
    this.bookmarks.set(bookmarksData);
    this.allTags.set(tagsData);
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

  protected async onRemoveTag(tagId: string): Promise<void> {
    const current = this.series();
    if (!current) return;
    await this.#seriesRepository.removeTag(current.id, tagId);
    this.series.set({ ...current, tagIds: current.tagIds.filter((id) => id !== tagId) });
  }

  /**
   * Resolves a typed tag name to an existing tag (case-insensitive) or
   * creates a new one, then applies it to the series being viewed.
   */
  protected async onSubmitTagName(name: string): Promise<void> {
    const current = this.series();
    if (!current) return;

    const existing = this.allTags().find((t) => t.name.toLowerCase() === name.toLowerCase());
    let tagId: string;

    if (existing) {
      tagId = existing.id;
    } else {
      const color = TAG_COLOR_PALETTE[this.allTags().length % TAG_COLOR_PALETTE.length];
      tagId = await this.#tagRepository.create(name, color);
      this.allTags.update((tags) => [
        ...tags,
        { id: tagId, name, color, createdAt: new Date() },
      ]);
    }

    if (current.tagIds.includes(tagId)) return;
    await this.#seriesRepository.addTag(current.id, tagId);
    this.series.set({ ...current, tagIds: [...current.tagIds, tagId] });
  }

  protected toggleCollectionMenu(): void {
    this.isCollectionMenuOpen.update((open) => !open);
  }

  protected isInCollection(collectionId: string): boolean {
    const current = this.series();
    if (!current) return false;
    const collection = this.collectionsStore.collections().find((c) => c.id === collectionId);
    return collection?.seriesIds.includes(current.id) ?? false;
  }

  protected async onToggleCollectionMembership(collectionId: string): Promise<void> {
    const current = this.series();
    if (!current) return;
    if (this.isInCollection(collectionId)) {
      await this.collectionsStore.removeSeriesFromCollection(collectionId, current.id);
    } else {
      await this.collectionsStore.addSeriesToCollection(collectionId, current.id);
    }
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
