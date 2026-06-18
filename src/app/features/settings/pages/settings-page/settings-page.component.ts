import { Component, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, BookOpen, Palette, HardDrive, Library, CheckCircle, Loader, BarChart2 } from 'lucide-angular';
import { SettingsStore } from '../../state/settings.store';
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
}
