import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { provideZonelessChangeDetection } from '@angular/core';

TestBed.initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } },
);

// Override configureTestingModule globally to include zoneless change detection
const originalConfigure = TestBed.configureTestingModule.bind(TestBed);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(TestBed as any).configureTestingModule = (config: any) =>
  originalConfigure({
    ...config,
    providers: [provideZonelessChangeDetection(), ...(config.providers ?? [])],
  });
