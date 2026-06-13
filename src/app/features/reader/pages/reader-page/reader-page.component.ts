import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, FolderOpen } from 'lucide-angular';
import { ReaderStore } from '../../state/reader.store';
import { ChapterRepository } from '../../../../data/repositories/chapter.repository';
import { PageViewerComponent } from '../../components/page-viewer/page-viewer.component';
import { ReaderControlsComponent } from '../../components/reader-controls/reader-controls.component';
import { PageProgressBarComponent } from '../../components/page-progress-bar/page-progress-bar.component';
import type { IChapter } from '../../../../domain/models/chapter.model';

@Component({
  selector: 'app-reader-page',
  standalone: true,
  imports: [
    RouterLink,
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

  /** The chapter record fetched from DB (used for back navigation). */
  protected readonly chapter = signal<IChapter | null>(null);

  /** True when we're waiting for the user to pick the chapter file. */
  protected readonly awaitingFile = signal(false);

  /** The chapter id from the route, cached for file-pick use. */
  protected chapterId = '';

  async ngOnInit(): Promise<void> {
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

  async ngOnDestroy(): Promise<void> {
    await this.store.closeChapter();
  }

  /** Called when the user picks the CBZ file for this chapter. */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.chapterId) return;
    this.awaitingFile.set(false);
    await this.store.openChapter(this.chapterId, file);
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
