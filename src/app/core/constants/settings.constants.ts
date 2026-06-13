import { ReadingMode } from '../../domain/enums/reading-mode.enum';

export const SETTINGS_STORAGE_KEY = 'tanoshi_settings';
export const DEFAULT_ACCENT_COLOR = 'gold' as const;
export const DEFAULT_SETTINGS_READING_MODE = ReadingMode.PagedRTL;

export const ACCENT_COLOR_VALUES: Record<'gold' | 'teal', string> = {
  gold: '#C8A96E',
  teal: '#4A9E8E',
};
