import { Component, input, output, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Bookmark, X } from 'lucide-angular';
import type { IBookmark } from '../../../../domain/models/bookmark.model';
import type { IChapter } from '../../../../domain/models/chapter.model';

interface IBookmarkRow {
  readonly bookmark: IBookmark;
  readonly chapterNumber: number | null;
}

@Component({
  selector: 'app-bookmarks-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './bookmarks-list.component.html',
})
export class BookmarksListComponent {
  protected readonly bookmarkIcon = Bookmark;
  protected readonly xIcon = X;

  /** Bookmarks for the series, newest first. */
  readonly bookmarks = input.required<IBookmark[]>();

  /** Chapters of the series, used to resolve chapter numbers for display. */
  readonly chapters = input<IChapter[]>([]);

  /** Emits the bookmark id when its remove button is clicked. */
  readonly removeBookmark = output<string>();

  protected readonly rows = computed<IBookmarkRow[]>(() => {
    const chapterMap = new Map(this.chapters().map((c) => [c.id, c]));
    return this.bookmarks().map((bookmark) => ({
      bookmark,
      chapterNumber: chapterMap.get(bookmark.chapterId)?.chapterNumber ?? null,
    }));
  });

  protected onRemove(event: Event, bookmarkId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.removeBookmark.emit(bookmarkId);
  }
}
