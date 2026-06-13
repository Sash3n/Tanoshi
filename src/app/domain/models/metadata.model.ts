export interface ISeriesMetadata {
  readonly anilistId: number | null;
  readonly mangaDexId: string | null;
  readonly coverImageUrl: string | null;
  readonly synopsis: string | null;
  readonly genres: string[];
  readonly author: string | null;
  readonly artist: string | null;
  readonly fetchedAt: Date;
}
