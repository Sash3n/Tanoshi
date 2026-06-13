import { Component, input, signal } from '@angular/core';
import type { ISeries } from '../../../../domain/models/series.model';
import type { ISeriesMetadata } from '../../../../domain/models/metadata.model';

const SYNOPSIS_TRUNCATE_LENGTH = 200;

@Component({
  selector: 'app-series-metadata-card',
  standalone: true,
  templateUrl: './series-metadata-card.component.html',
})
export class SeriesMetadataCardComponent {
  /** Core series data from the local library. */
  readonly series = input.required<ISeries>();

  /** Remote metadata fetched from AniList or MangaDex, may be null while loading. */
  readonly metadata = input<ISeriesMetadata | null>(null);

  /** Controls whether the full synopsis is shown or truncated. */
  protected readonly isSynopsisExpanded = signal(false);

  protected get displaySynopsis(): string {
    const fullText = this.metadata()?.synopsis ?? this.series().synopsis ?? '';
    if (this.isSynopsisExpanded() || fullText.length <= SYNOPSIS_TRUNCATE_LENGTH) {
      return fullText;
    }
    return fullText.slice(0, SYNOPSIS_TRUNCATE_LENGTH).trimEnd() + '…';
  }

  protected get canExpandSynopsis(): boolean {
    const fullText = this.metadata()?.synopsis ?? this.series().synopsis ?? '';
    return fullText.length > SYNOPSIS_TRUNCATE_LENGTH;
  }

  protected get displayGenres(): string[] {
    return this.metadata()?.genres ?? this.series().genres;
  }

  protected get displayAuthor(): string | null {
    return this.metadata()?.author ?? this.series().author;
  }

  protected get displayArtist(): string | null {
    return this.metadata()?.artist ?? this.series().artist;
  }

  protected toggleSynopsis(): void {
    this.isSynopsisExpanded.update((expanded) => !expanded);
  }
}
