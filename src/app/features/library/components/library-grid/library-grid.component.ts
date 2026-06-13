import { Component, input } from '@angular/core';
import { SeriesCardComponent } from '../series-card/series-card.component';
import type { ISeries } from '../../../../domain/models/series.model';

@Component({
  selector: 'app-library-grid',
  standalone: true,
  imports: [SeriesCardComponent],
  templateUrl: './library-grid.component.html',
})
export class LibraryGridComponent {
  /** The list of series to render in the grid. */
  readonly seriesList = input.required<ISeries[]>();
}
