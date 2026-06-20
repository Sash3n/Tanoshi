import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, FolderOpen } from 'lucide-angular';
import { ReaderStore } from '../../state/reader.store';
import { ChapterRepository } from '../../../../data/repositories/chapter.repository';
import { PageViewerComponent } from '../../components/page-viewer/page-viewer.component';
import { ReaderControlsComponent } from '../../components/reader-controls/reader-controls.component';
import { PageProgressBarComponent } from '../../components/page-progress-bar/page-progress-bar.component';
import type { IChapter } from '../../../../domain/models/chapter.model';

async function setImmersiveMode(enabled: boolean): Promise<void> {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    if (enabled) {
      await StatusBar.hide();
    } else {
      await StatusBar.show();
      await StatusBar.setStyle({ style: Style.Dark });
    }
  } catch {
    // Web/desktop: StatusBar plugin not available
  }
}

@Component({
  selector: 'app-reader-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    PageViewerComponent,
    ReaderControlsComponent,
    PageProgressBarComponent,
  ],
  templateUrl: './reader-page.component.html',
})
export class ReaderPageComponent implements OnInit, OnDestroy {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #chapterRepository = inject(ChapterRepository);

  protected readonly store = inject(ReaderStore);
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly folderOpenIcon = FolderOpen;

  protected readonly chapter = signal<IChapter | null>(null);
  protected readonly awaitingFile = signal(false);
  protected chapterId = '';

  async ngOnInit(): Promise<void> {
    void setImmersiveMode(true);
    const routeChapterId = this.#route.snapshot.paramMap.get('chapterId');
    if (!routeChapterId) {
      await this.#router.navigate(['/library']);
      return;
    }
    this.chapterId = routeChapterId;

    const chapterRecord = await this.#chapterRepository.getById(routeChapterId);
    if (!chapterRecord) {
      await this.#router.navigate(['/library']);
      return;
    }
    this.chapter.set(chapterRecord);
    this.awaitingFile.set(true);
  }

  // Angular does not await ngOnDestroy — kick off fire-and-forget cleanup
  // so progress is saved and blob URLs are released without blocking teardown.
  ngOnDestroy(): void {
    void setImmersiveMode(false);
    void this.store.closeChapter();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.chapterId) return;
    this.awaitingFile.set(false);
    await this.store.openChapter(this.chapterId, file);

    // A ?page= query param (e.g. from a bookmark link) overrides the
    // last-read page that openChapter restores by default.
    const requestedPage = this.#route.snapshot.queryParamMap.get('page');
    if (requestedPage !== null) {
      this.store.goToPage(Number(requestedPage));
    }
  }

  protected onBackNavigation(): void {
    const chapterData = this.chapter();
    if (chapterData) {
      void this.#router.navigate(['/series', chapterData.seriesId]);
    } else {
      void this.#router.navigate(['/library']);
    }
  }
}
