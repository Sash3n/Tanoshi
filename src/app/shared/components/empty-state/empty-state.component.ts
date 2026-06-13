import { Component, input } from '@angular/core';
import { LucideAngularModule, BookOpen } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  /** Primary message shown in large text. */
  readonly title = input<string>('No manga yet');

  /** Secondary descriptive text shown below the title. */
  readonly description = input<string>('Tap the + button to import your first CBZ, CBR, or PDF file.');

  protected readonly bookOpenIcon = BookOpen;
}
