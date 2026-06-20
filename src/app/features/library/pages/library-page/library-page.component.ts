import { Component, inject, signal, OnInit } from '@angular/core';
import { LibraryStore } from '../../state/library.store';
import { TagRepository } from '../../../../data/repositories/tag.repository';
import { LibraryGridComponent } from '../../components/library-grid/library-grid.component';
import { ImportFabComponent } from '../../components/import-fab/import-fab.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LucideAngularModule, Search, ArrowUpDown, Star } from 'lucide-angular';
import { ContinueReadingCardComponent } from '../../../../shared/components/continue-reading-card/continue-reading-card.component';
import { LIBRARY_SORT_LABELS } from '../../../../core/constants/library.constants';
import type { ITag } from '../../../../domain/models/tag.model';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [LibraryGridComponent, ImportFabComponent, EmptyStateComponent, LucideAngularModule, ContinueReadingCardComponent],
  templateUrl: './library-page.component.html',
})
export class LibraryPageComponent implements OnInit {
  readonly #tagRepository = inject(TagRepository);
  protected readonly store = inject(LibraryStore);
  protected readonly searchIcon = Search;
  protected readonly sortIcon = ArrowUpDown;
  protected readonly starIcon = Star;
  protected readonly sortLabels = LIBRARY_SORT_LABELS;
  protected readonly allTags = signal<ITag[]>([]);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.store.loadLibrary(), this.#loadTags()]);
  }

  async #loadTags(): Promise<void> {
    this.allTags.set(await this.#tagRepository.getAll());
  }

  protected async onFileSelected(file: File): Promise<void> {
    await this.store.importFile(file);
  }

  protected async onToggleFavorite(seriesId: string): Promise<void> {
    await this.store.toggleFavorite(seriesId);
  }

  protected onToggleFavoritesOnly(): void {
    this.store.setFavoritesOnly(!this.store.favoritesOnly());
  }

  protected onToggleTagFilter(tagId: string): void {
    this.store.setActiveTagId(this.store.activeTagId() === tagId ? null : tagId);
  }

  protected onToggleGenreFilter(genre: string): void {
    this.store.setActiveGenre(this.store.activeGenre() === genre ? null : genre);
  }
}
