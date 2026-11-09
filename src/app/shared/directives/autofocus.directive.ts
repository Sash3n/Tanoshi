import { Directive, ElementRef, inject, afterNextRender } from '@angular/core';

/**
 * Focuses the host element once it is rendered. Used in place of the native
 * `autofocus` attribute (flagged by a11y lint rules) for elements that only
 * appear in response to a direct user action, such as an inline "add" input.
 */
@Directive({
  selector: '[appAutofocus]',
  standalone: true,
})
export class AutofocusDirective {
  readonly #elementRef = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => this.#elementRef.nativeElement.focus());
  }
}
