import { Component, input, output, computed, signal } from '@angular/core';
import { LucideAngularModule, Plus, X } from 'lucide-angular';
import type { ITag } from '../../../../domain/models/tag.model';

@Component({
  selector: 'app-tag-chips',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './tag-chips.component.html',
})
export class TagChipsComponent {
  protected readonly plusIcon = Plus;
  protected readonly xIcon = X;

  /** The full tag library, used to resolve names/colors for applied tag ids. */
  readonly allTags = input<ITag[]>([]);

  /** Tag ids currently applied to the series being viewed. */
  readonly appliedTagIds = input<string[]>([]);

  /** Emits the tag id to remove from the series. */
  readonly removeTag = output<string>();

  /**
   * Emits a trimmed, non-empty tag name the user typed.
   * The page component resolves it to an existing tag or creates a new one.
   */
  readonly submitTagName = output<string>();

  protected readonly isAdding = signal(false);
  protected readonly draftName = signal('');

  protected readonly appliedTags = computed(() => {
    const tagMap = new Map(this.allTags().map((t) => [t.id, t]));
    return this.appliedTagIds()
      .map((id) => tagMap.get(id))
      .filter((tag): tag is ITag => tag !== undefined);
  });

  protected startAdding(): void {
    this.isAdding.set(true);
  }

  protected onDraftInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(): void {
    const name = this.draftName().trim();
    this.draftName.set('');
    this.isAdding.set(false);
    if (name.length === 0) return;
    this.submitTagName.emit(name);
  }

  protected onCancel(): void {
    this.draftName.set('');
    this.isAdding.set(false);
  }
}
