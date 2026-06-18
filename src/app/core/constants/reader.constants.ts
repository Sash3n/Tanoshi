import { ReadingDirection } from '../../domain/enums/reading-direction.enum';
import { ReadingMode } from '../../domain/enums/reading-mode.enum';

export const MAX_PRELOAD_PAGES = 5;
export const DEFAULT_READING_DIRECTION = ReadingDirection.RightToLeft;
export const DEFAULT_READING_MODE = ReadingMode.PagedRTL;
export const DEFAULT_PRELOAD_PAGES_AHEAD = 2;
export const DEFAULT_PRELOAD_PAGES_BEHIND = 1;
export const PROGRESS_SAVE_INTERVAL_PAGES = 3;
export const TAP_ZONE_LEFT_THRESHOLD = 0.33;
export const TAP_ZONE_RIGHT_THRESHOLD = 0.66;
export const SWIPE_THRESHOLD_PX = 40;
export const PAGE_FILTERS = ['none', 'sepia', 'greyscale', 'inverted'] as const;
export type PageFilter = typeof PAGE_FILTERS[number];
