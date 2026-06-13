import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SettingsStore } from './settings.store';
import { ReadingMode } from '../../../domain/enums/reading-mode.enum';
import { SETTINGS_STORAGE_KEY, ACCENT_COLOR_VALUES } from '../../../core/constants/settings.constants';

describe('SettingsStore', () => {
  let store: SettingsStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(SettingsStore);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ── Defaults ──────────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should default to PagedRTL reading mode', () => {
      expect(store.defaultReadingMode()).toBe(ReadingMode.PagedRTL);
    });

    it('should default to gold accent', () => {
      expect(store.accentColor()).toBe('gold');
    });
  });

  // ── Reading mode ──────────────────────────────────────────────────────────

  describe('setDefaultReadingMode', () => {
    it('should update the reading mode signal', () => {
      store.setDefaultReadingMode(ReadingMode.LongStrip);
      expect(store.defaultReadingMode()).toBe(ReadingMode.LongStrip);
    });

    it('should persist the reading mode to localStorage', () => {
      store.setDefaultReadingMode(ReadingMode.PagedLTR);
      TestBed.flushEffects();
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
      expect(saved.defaultReadingMode).toBe(ReadingMode.PagedLTR);
    });
  });

  // ── Accent colour ─────────────────────────────────────────────────────────

  describe('setAccentColor', () => {
    it('should update the accent color signal', () => {
      store.setAccentColor('teal');
      expect(store.accentColor()).toBe('teal');
    });

    it('should persist the accent color to localStorage', () => {
      store.setAccentColor('teal');
      TestBed.flushEffects();
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
      expect(saved.accentColor).toBe('teal');
    });

    it('should apply the teal CSS variable to document root', () => {
      store.setAccentColor('teal');
      TestBed.flushEffects();
      const value = document.documentElement.style.getPropertyValue('--tanoshi-accent-gold');
      expect(value).toBe(ACCENT_COLOR_VALUES['teal']);
    });

    it('should apply the gold CSS variable back when switching to gold', () => {
      store.setAccentColor('teal');
      TestBed.flushEffects();
      store.setAccentColor('gold');
      TestBed.flushEffects();
      const value = document.documentElement.style.getPropertyValue('--tanoshi-accent-gold');
      expect(value).toBe(ACCENT_COLOR_VALUES['gold']);
    });
  });

  // ── Storage computed ──────────────────────────────────────────────────────

  describe('storage computed values', () => {
    it('should return null for storageUsedMB when not yet loaded', () => {
      store.storageUsedBytes.set(null);
      expect(store.storageUsedMB()).toBeNull();
    });

    it('should format bytes to MB with one decimal', () => {
      store.storageUsedBytes.set(5 * 1024 * 1024);
      expect(store.storageUsedMB()).toBe('5.0');
    });

    it('should compute storagePercent correctly', () => {
      store.storageUsedBytes.set(25 * 1024 * 1024);
      store.storageQuotaBytes.set(100 * 1024 * 1024);
      expect(store.storagePercent()).toBe(25);
    });

    it('should return 0 for storagePercent when quota is null', () => {
      store.storageUsedBytes.set(10 * 1024 * 1024);
      store.storageQuotaBytes.set(null);
      expect(store.storagePercent()).toBe(0);
    });

    it('should cap storagePercent at 100', () => {
      store.storageUsedBytes.set(200 * 1024 * 1024);
      store.storageQuotaBytes.set(100 * 1024 * 1024);
      expect(store.storagePercent()).toBe(100);
    });
  });

  // ── Persistence across reload ─────────────────────────────────────────────

  describe('persistence', () => {
    it('should restore settings from localStorage on construction', () => {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ defaultReadingMode: ReadingMode.LongStrip, accentColor: 'teal' }),
      );
      // Re-create store to simulate page reload
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshStore = TestBed.inject(SettingsStore);
      expect(freshStore.defaultReadingMode()).toBe(ReadingMode.LongStrip);
      expect(freshStore.accentColor()).toBe('teal');
    });
  });
});
