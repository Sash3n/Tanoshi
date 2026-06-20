import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, X } from 'lucide-angular';
import { CollectionsStore } from '../../state/collections.store';
import { SeriesRepository } from '../../../../data/repositories/series.repository';
import type { ICollection } from '../../../../domain/models/collection.model';
import type { ISeries } from '../../../../domain/models/series.model';

@Component({
  selector: 'app-collection-detail-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './collection-detail-page.component.html',
})
export class CollectionDetailPageComponent implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #seriesRepository = inject(SeriesRepository);
  protected readonly store = inject(CollectionsStore);

  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly xIcon = X;

  protected readonly collection = signal<ICollection | null>(null);
  protected readonly seriesList = signal<ISeries[]>([]);
  protected readonly isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    const collectionId = this.#route.snapshot.paramMap.get('id');
    if (!collectionId) {
      await this.#router.navigate(['/collections']);
      return;
    }

    await this.store.loadCollections();
    const found = this.store.collections().find((c) => c.id === collectionId);
    if (!found) {
      await this.#router.navigate(['/collections']);
      return;
    }

    this.collection.set(found);
    await this.#loadSeries(found.seriesIds);
    this.isLoading.set(false);
  }

  protected async onRemoveSeries(seriesId: string): Promise<void> {
    const current = this.collection();
    if (!current) return;
    await this.store.removeSeriesFromCollection(current.id, seriesId);
    this.collection.set({ ...current, seriesIds: current.seriesIds.filter((id) => id !== seriesId) });
    this.seriesList.update((list) => list.filter((s) => s.id !== seriesId));
  }

  async #loadSeries(seriesIds: string[]): Promise<void> {
    const records = await Promise.all(seriesIds.map((id) => this.#seriesRepository.getById(id)));
    this.seriesList.set(records.filter((s): s is ISeries => s !== undefined));
  }
}
