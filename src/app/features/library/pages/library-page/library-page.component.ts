import { Component, inject, OnInit } from '@angular/core';
import { LibraryStore } from '../../state/library.store';
import { LibraryGridComponent } from '../../components/library-grid/library-grid.component';
import { ImportFabComponent } from '../../components/import-fab/import-fab.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LucideAngularModule, Search, ArrowUpDown, Star } from 'lucide-angular';
import { ContinueReadingCardComponent } from '../../../../shared/components/continue-reading-card/continue-reading-card.component';
import { LIBRARY_SORT_LABELS } from '../../../../core/constants/library.constants';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [LibraryGridComponent, ImportFabComponent, EmptyStateComponent, LucideAngularModule, ContinueReadingCardComponent],
  templateUrl: './library-page.component.html',
})
export class LibraryPageComponent implements OnInit {
  protected readonly store = inject(LibraryStore);
  protected readonly searchIcon = Search;
  protected readonly sortIcon = ArrowUpDown;
  protected readonly starIcon = Star;
  protected readonly sortLabels = LIBRARY_SORT_LABELS;

  async ngOnInit(): Promise<void> {
    await this.store.loadLibrary();
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
}
