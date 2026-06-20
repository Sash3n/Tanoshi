import type { FileFormat } from '../enums/file-format.enum';

export interface ISeries {
  readonly id: string;
  readonly title: string;
  readonly alternativeTitles: string[];
  readonly coverImageBase64: string | null;
  readonly totalChapterCount: number;
  readonly fileFormat: FileFormat;
  readonly localFilePath: string;
  readonly anilistId: number | null;
  readonly mangaDexId: string | null;
  readonly genres: string[];
  readonly synopsis: string | null;
  readonly author: string | null;
  readonly artist: string | null;
  readonly isFavorite: boolean;
  readonly tagIds: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
