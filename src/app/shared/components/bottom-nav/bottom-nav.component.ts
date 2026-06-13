import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Library, Settings } from 'lucide-angular';
import { SettingsStore } from '../../../features/settings/state/settings.store';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './bottom-nav.component.html',
})
export class BottomNavComponent {
  protected readonly settingsStore = inject(SettingsStore);
  protected readonly libraryIcon = Library;
  protected readonly settingsIcon = Settings;
}
