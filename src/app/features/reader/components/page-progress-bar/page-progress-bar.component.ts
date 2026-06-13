import { Component, inject } from '@angular/core';
import { ReaderStore } from '../../state/reader.store';

@Component({
  selector: 'app-page-progress-bar',
  standalone: true,
  templateUrl: './page-progress-bar.component.html',
  host: { class: 'block w-full' },
})
export class PageProgressBarComponent {
  protected readonly store = inject(ReaderStore);
}
