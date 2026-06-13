import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { ToastComponent } from './shared/components/toast/toast.component';

const SHELL_ROUTES = ['/library', '/settings'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent, ToastComponent],
  template: `
    <router-outlet />
    @if (showBottomNav()) {
      <app-bottom-nav />
    }
    <app-toast />
  `,
  styles: [`:host { display: block; min-height: 100vh; background-color: var(--tanoshi-bg-base); }`],
})
export class App {
  readonly #router = inject(Router);

  readonly #currentUrl = toSignal(
    this.#router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.#router.url),
    ),
    { initialValue: this.#router.url },
  );

  protected readonly showBottomNav = computed(() =>
    SHELL_ROUTES.some((route) => this.#currentUrl().startsWith(route)),
  );
}
