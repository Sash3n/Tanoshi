import {
  Component, inject, computed, HostListener, ElementRef, viewChild, OnDestroy,
} from '@angular/core';
import { ReaderStore } from '../../state/reader.store';
import { ReadingMode } from '../../../../domain/enums/reading-mode.enum';
import { TAP_ZONE_LEFT_THRESHOLD, TAP_ZONE_RIGHT_THRESHOLD } from '../../../../core/constants/reader.constants';

@Component({
  selector: 'app-page-viewer',
  standalone: true,
  templateUrl: './page-viewer.component.html',
  host: { class: 'block w-full h-full' },
})
export class PageViewerComponent implements OnDestroy {
  protected readonly store = inject(ReaderStore);

  protected readonly containerRef = viewChild.required<ElementRef<HTMLElement>>('container');

  /** Sorted loaded pages for long-strip mode. */
  protected readonly allPages = computed(() => {
    const map = this.store.loadedPages();
    const total = this.store.totalPageCount();
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      blobUrl: map.get(i) ?? null,
    }));
  });

  readonly #pointerStartX = { value: 0 };
  readonly #pointerStartY = { value: 0 };
  readonly #SWIPE_THRESHOLD_PX = 40;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.#pointerStartX.value = event.clientX;
    this.#pointerStartY.value = event.clientY;
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    const deltaX = event.clientX - this.#pointerStartX.value;
    const deltaY = event.clientY - this.#pointerStartY.value;

    // Only handle horizontal swipes (more X than Y movement)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.#SWIPE_THRESHOLD_PX) {
      this.#handleSwipe(deltaX);
      return;
    }

    // Treat short movements as taps
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      this.#handleTap(event);
    }
  }

  ngOnDestroy(): void {
    // Blob URLs are cleaned up by the store on closeChapter
  }

  #handleTap(event: PointerEvent): void {
    if (this.store.isLongStrip()) return;

    const containerWidth = (event.target as HTMLElement).closest('[data-reader-container]')?.clientWidth
      ?? window.innerWidth;
    const normalizedX = event.clientX / containerWidth;

    if (normalizedX < TAP_ZONE_LEFT_THRESHOLD) {
      this.#navigateNext();
    } else if (normalizedX > TAP_ZONE_RIGHT_THRESHOLD) {
      this.#navigatePrevious();
    } else {
      this.store.toggleControls();
    }
  }

  #handleSwipe(deltaX: number): void {
    if (this.store.isLongStrip()) return;
    // In RTL: swipe left (negative deltaX) = go to next page
    if (this.store.isRightToLeft()) {
      if (deltaX < 0) this.#navigateNext();
      else this.#navigatePrevious();
    } else {
      if (deltaX > 0) this.#navigateNext();
      else this.#navigatePrevious();
    }
  }

  #navigateNext(): void {
    if (this.store.isRightToLeft()) {
      this.store.goToNextPage();
    } else {
      this.store.goToNextPage();
    }
  }

  #navigatePrevious(): void {
    this.store.goToPreviousPage();
  }
}
