export interface IReadingProgress {
  readonly id: string;
  readonly chapterId: string;
  readonly seriesId: string;
  readonly currentPageIndex: number;
  readonly totalPageCount: number;
  readonly isCompleted: boolean;
  readonly lastReadAt: Date;
  readonly readingDurationSeconds: number;
}
