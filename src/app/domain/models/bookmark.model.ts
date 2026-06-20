export interface IBookmark {
  readonly id: string;
  readonly chapterId: string;
  readonly seriesId: string;
  readonly pageIndex: number;
  readonly note: string | null;
  readonly createdAt: Date;
}
