import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Play, BookOpen } from 'lucide-angular';
import { ContinueReadingService, type IContinueReadingEntry } from '../../services/continue-reading.service';

@Component({
  selector: 'app-continue-reading-card',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './continue-reading-card.component.html',
})
export class ContinueReadingCardComponent implements OnInit {
  readonly #service = inject(ContinueReadingService);

  protected readonly entry = signal<IContinueReadingEntry | null>(null);
  protected readonly playIcon = Play;
  protected readonly bookIcon = BookOpen;

  async ngOnInit(): Promise<void> {
    this.entry.set(await this.#service.getLastRead());
  }

  protected get progressPercent(): number {
    const p = this.entry()?.progress;
    if (!p || p.totalPageCount === 0) return 0;
    return Math.round((p.currentPageIndex / (p.totalPageCount - 1)) * 100);
  }
}
