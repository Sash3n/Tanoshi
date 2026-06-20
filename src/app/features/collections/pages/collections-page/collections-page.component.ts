import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, FolderHeart, Plus } from 'lucide-angular';
import { CollectionsStore } from '../../state/collections.store';

@Component({
  selector: 'app-collections-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './collections-page.component.html',
})
export class CollectionsPageComponent implements OnInit {
  protected readonly store = inject(CollectionsStore);
  protected readonly folderIcon = FolderHeart;
  protected readonly plusIcon = Plus;

  protected readonly isCreating = signal(false);
  protected readonly draftName = signal('');

  async ngOnInit(): Promise<void> {
    await this.store.loadCollections();
  }

  protected startCreating(): void {
    this.isCreating.set(true);
  }

  protected onDraftInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected async onSubmit(): Promise<void> {
    const name = this.draftName().trim();
    this.draftName.set('');
    this.isCreating.set(false);
    if (name.length === 0) return;
    await this.store.createCollection(name);
  }

  protected onCancel(): void {
    this.draftName.set('');
    this.isCreating.set(false);
  }
}
