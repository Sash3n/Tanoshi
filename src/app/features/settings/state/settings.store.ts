import { Injectable, signal, computed, effect } from '@angular/core';
import { ReadingMode } from '../../../domain/enums/reading-mode.enum';
import { tanoshiDb } from '../../../data/database/tanoshi-db';
import {
  SETTINGS_STORAGE_KEY,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_SETTINGS_READING_MODE,
  ACCENT_COLOR_VALUES,
} from '../../../core/constants/settings.constants';

export type AccentColor = 'gold' | 'teal';

interface IPersistedSettings {
  readonly defaultReadingMode: ReadingMode;
  readonly accentColor: AccentColor;
}

function loadPersistedSettings(): IPersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as IPersistedSettings;
  } catch {
    // corrupt storage — fall through to defaults
  }
  return { defaultReadingMode: DEFAULT_SETTINGS_READING_MODE, accentColor: DEFAULT_ACCENT_COLOR };
}

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly defaultReadingMode = signal<ReadingMode>(loadPersistedSettings().defaultReadingMode);
  readonly accentColor = signal<AccentColor>(loadPersistedSettings().accentColor);

  /** Estimated storage used in bytes (null while loading). */
  readonly storageUsedBytes = signal<number | null>(null);
  /** Estimated storage quota in bytes (null while loading). */
  readonly storageQuotaBytes = signal<number | null>(null);

  readonly storageUsedMB = computed(() => {
    const used = this.storageUsedBytes();
    return used !== null ? (used / (1024 * 1024)).toFixed(1) : null;
  });

  readonly storageQuotaMB = computed(() => {
    const quota = this.storageQuotaBytes();
    return quota !== null ? (quota / (1024 * 1024)).toFixed(0) : null;
  });

  readonly storagePercent = computed(() => {
    const used = this.storageUsedBytes();
    const quota = this.storageQuotaBytes();
    if (used === null || quota === null || quota === 0) return 0;
    return Math.min(100, Math.round((used / quota) * 100));
  });

  constructor() {
    // Persist on every change
    effect(() => {
      const settings: IPersistedSettings = {
        defaultReadingMode: this.defaultReadingMode(),
        accentColor: this.accentColor(),
      };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // storage quota exceeded — ignore
      }
    });

    // Apply accent colour to the root CSS variable
    effect(() => {
      const color = this.accentColor();
      document.documentElement.style.setProperty('--tanoshi-accent-gold', ACCENT_COLOR_VALUES[color]);
    });

    void this.refreshStorageEstimate();
  }

  setDefaultReadingMode(mode: ReadingMode): void {
    this.defaultReadingMode.set(mode);
  }

  setAccentColor(color: AccentColor): void {
    this.accentColor.set(color);
  }

  async clearMetadataCache(): Promise<void> {
    await tanoshiDb.metadataCache.clear();
    await this.refreshStorageEstimate();
  }

  async refreshStorageEstimate(): Promise<void> {
    try {
      const estimate = await navigator.storage.estimate();
      this.storageUsedBytes.set(estimate.usage ?? null);
      this.storageQuotaBytes.set(estimate.quota ?? null);
    } catch {
      // API not available
    }
  }
}
