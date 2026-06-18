import {
  Component, inject, computed, signal, effect, HostListener,
} from '@angular/core';
import { ReaderStore } from '../../state/reader.store';
import {
  TAP_ZONE_LEFT_THRESHOLD,
  TAP_ZONE_RIGHT_THRESHOLD,
  SWIPE_THRESHOLD_PX,
} from '../../../../core/constants/reader.constants';

@Component({
  selector: 'app-page-viewer',
  standalone: true,
  templateUrl: './page-viewer.component.html',
  host: { class: 'block w-full h-full' },
})
export class PageViewerComponent {
  protected readonly store = inject(ReaderStore);

  /** Sorted loaded pages for long-strip mode. */
  protected readonly allPages = computed(() => {
    const map = this.store.loadedPages();
    const total = this.store.totalPageCount();
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      blobUrl: map.get(i) ?? null,
    }));
  });

  /** CSS animation class applied to the page image on page turn. */
  protected readonly pageTransitionClass = signal<string>('');

  readonly #pointerStartX = { value: 0 };
  readonly #pointerStartY = { value: 0 };
  #prevPageIndex = 0;

  constructor() {
    effect(() => {
      const current = this.store.currentPageIndex();
      const prev = this.#prevPageIndex;
      if (current === prev) return;

      const goingForward = current > prev;
      const rtl = this.store.isRightToLeft();
      const fromClass = goingForward
        ? (rtl ? 'animate-slide-in-right' : 'animate-slide-in-left')
        : (rtl ? 'animate-slide-in-left' : 'animate-slide-in-right');

      this.pageTransitionClass.set(fromClass);
      this.#prevPageIndex = current;
    });
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.#pointerStartX.value = event.clientX;
    this.#pointerStartY.value = event.clientY;
  }

  @HostListener('pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    const deltaX = event.clientX - this.#pointerStartX.value;
    const deltaY = event.clientY - this.#pointerStartY.value;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
      this.#handleSwipe(deltaX);
      return;
    }

    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      this.#handleTap(event);
    }
  }

  #handleTap(event: PointerEvent): void {
    if (this.store.isLongStrip()) return;

    const containerWidth =
      (event.target as HTMLElement).closest('[data-reader-container]')?.clientWidth
      ?? window.innerWidth;
    const normalizedX = event.clientX / containerWidth;

    const rtl = this.store.isRightToLeft();

    if (normalizedX < TAP_ZONE_LEFT_THRESHOLD) {
      // Left zone: previous page in RTL (manga), next page in LTR (comics)
      if (rtl) this.store.goToPreviousPage(); else this.store.goToNextPage();
    } else if (normalizedX > TAP_ZONE_RIGHT_THRESHOLD) {
      // Right zone: next page in RTL, previous page in LTR
      if (rtl) this.store.goToNextPage(); else this.store.goToPreviousPage();
    } else {
      this.store.toggleControls();
    }
  }

  #handleSwipe(deltaX: number): void {
    if (this.store.isLongStrip()) return;
    // RTL: swipe left (negative deltaX) turns to next page (further into the manga)
    if (this.store.isRightToLeft()) {
      if (deltaX < 0) this.store.goToNextPage();
      else this.store.goToPreviousPage();
    } else {
      if (deltaX > 0) this.store.goToPreviousPage();
      else this.store.goToNextPage();
    }
  }
}
