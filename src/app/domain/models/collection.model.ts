export interface ICollection {
  readonly id: string;
  readonly name: string;
  readonly seriesIds: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
