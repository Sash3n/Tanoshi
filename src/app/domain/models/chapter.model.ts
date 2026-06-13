export interface IChapter {
  readonly id: string;
  readonly seriesId: string;
  readonly chapterNumber: number;
  readonly volumeNumber: number | null;
  readonly title: string | null;
  readonly localFilePath: string;
  readonly pageCount: number;
  readonly fileSizeBytes: number;
  readonly importedAt: Date;
}
