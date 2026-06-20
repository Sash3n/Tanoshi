import { Component, inject } from '@angular/core';
import { LucideAngularModule, X, ChevronLeft, ChevronRight, AlignJustify, BookOpen, SunMedium, Bookmark } from 'lucide-angular';
import { ReaderStore } from '../../state/reader.store';
import { ReadingMode } from '../../../../domain/enums/reading-mode.enum';

@Component({
  selector: 'app-reader-controls',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './reader-controls.component.html',
})
export class ReaderControlsComponent {
  protected readonly store = inject(ReaderStore);

  protected readonly xIcon = X;
  protected readonly chevronLeftIcon = ChevronLeft;
  protected readonly chevronRightIcon = ChevronRight;
  protected readonly alignJustifyIcon = AlignJustify;
  protected readonly bookOpenIcon = BookOpen;
  protected readonly sunIcon = SunMedium;
  protected readonly bookmarkIcon = Bookmark;

  protected onToggleBookmark(): void {
    void this.store.toggleBookmark();
  }

  /** Expose enum to the template. */
  protected readonly ReadingMode = ReadingMode;

  protected onScrubberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.goToPage(Number(input.value));
  }

  protected cycleReadingMode(): void {
    const modes = [ReadingMode.PagedRTL, ReadingMode.PagedLTR, ReadingMode.LongStrip];
    const currentIndex = modes.indexOf(this.store.readingMode());
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.store.setReadingMode(nextMode);
  }

  protected get readingModeLabel(): string {
    const labels: Record<ReadingMode, string> = {
      [ReadingMode.PagedRTL]: 'RTL',
      [ReadingMode.PagedLTR]: 'LTR',
      [ReadingMode.LongStrip]: 'Strip',
    };
    return labels[this.store.readingMode()];
  }
}
