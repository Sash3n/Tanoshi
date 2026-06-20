import { Component, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, BookOpen, Palette, HardDrive, Library, CheckCircle, Loader, BarChart2, Download, Upload } from 'lucide-angular';
import { SettingsStore } from '../../state/settings.store';
import { BackupService } from '../../../../core/services/backup.service';
import { MAX_BACKUP_FILE_SIZE_BYTES } from '../../../../core/constants/backup.constants';
import { ReadingMode } from '../../../../domain/enums/reading-mode.enum';
import { ReadingStatsComponent } from '../../components/reading-stats/reading-stats.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [LucideAngularModule, ReadingStatsComponent],
  templateUrl: './settings-page.component.html',
})
export class SettingsPageComponent implements OnDestroy {
  readonly #router = inject(Router);
  readonly #backupService = inject(BackupService);
  #cacheClearedTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly store = inject(SettingsStore);
  protected readonly ReadingMode = ReadingMode;

  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly bookOpenIcon = BookOpen;
  protected readonly paletteIcon = Palette;
  protected readonly hardDriveIcon = HardDrive;
  protected readonly libraryIcon = Library;
  protected readonly checkCircleIcon = CheckCircle;
  protected readonly loaderIcon = Loader;
  protected readonly barChartIcon = BarChart2;
  protected readonly downloadIcon = Download;
  protected readonly uploadIcon = Upload;

  protected readonly readingModeOptions = [
    { mode: ReadingMode.PagedRTL,  label: 'RTL',     sub: 'Manga style' },
    { mode: ReadingMode.PagedLTR,  label: 'LTR',     sub: 'Comic style' },
    { mode: ReadingMode.LongStrip, label: 'Webtoon', sub: 'Long strip'  },
  ] as const;

  protected readonly accentOptions = [
    { color: 'gold' as const, hex: '#C8A96E', label: 'Gold' },
    { color: 'teal' as const, hex: '#4A9E8E', label: 'Teal' },
  ] as const;

  protected readonly isClearingCache = signal(false);
  protected readonly cacheCleared = signal(false);

  protected readonly isExporting = signal(false);
  protected readonly isImporting = signal(false);
  protected readonly importError = signal<string | null>(null);

  ngOnDestroy(): void {
    if (this.#cacheClearedTimer !== null) {
      clearTimeout(this.#cacheClearedTimer);
    }
  }

  protected onBack(): void {
    void this.#router.navigate(['/library']);
  }

  protected setReadingMode(mode: ReadingMode): void {
    this.store.setDefaultReadingMode(mode);
  }

  protected async onClearCache(): Promise<void> {
    if (this.isClearingCache()) return;
    if (this.#cacheClearedTimer !== null) clearTimeout(this.#cacheClearedTimer);
    this.isClearingCache.set(true);
    this.cacheCleared.set(false);
    await this.store.clearMetadataCache();
    this.isClearingCache.set(false);
    this.cacheCleared.set(true);
    this.#cacheClearedTimer = setTimeout(() => {
      this.cacheCleared.set(false);
      this.#cacheClearedTimer = null;
    }, 3000);
  }

  protected async onExportBackup(): Promise<void> {
    if (this.isExporting()) return;
    this.isExporting.set(true);
    try {
      const payload = await this.#backupService.buildExportPayload();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tanoshi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      this.isExporting.set(false);
    }
  }

  protected async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    // Reject oversized files before reading them into memory — checking only
    // inside parseBackupFile would be too late, since file.text() below
    // already has to materialise the full content as a string first.
    if (file.size > MAX_BACKUP_FILE_SIZE_BYTES) {
      this.importError.set(
        `Backup file is too large (${Math.round(file.size / 1024 / 1024)}MB). ` +
          `Maximum supported size is ${MAX_BACKUP_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      );
      return;
    }

    const confirmed = window.confirm(
      'Restoring a backup replaces your entire library, reading progress, bookmarks, tags, and collections. This cannot be undone. Continue?',
    );
    if (!confirmed) return;

    this.isImporting.set(true);
    this.importError.set(null);
    try {
      const fileText = await file.text();
      const payload = this.#backupService.parseBackupFile(file, fileText);
      await this.#backupService.restoreFromPayload(payload);
      window.location.reload();
    } catch (error) {
      this.importError.set(error instanceof Error ? error.message : 'Failed to restore backup');
      this.isImporting.set(false);
    }
  }
}
