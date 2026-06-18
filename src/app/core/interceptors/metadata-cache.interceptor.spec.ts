import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { metadataCacheInterceptor } from './metadata-cache.interceptor';
import { tanoshiDb } from '../../data/database/tanoshi-db';
import { ANILIST_GRAPHQL_URL, METADATA_CACHE_TTL_DAYS } from '../constants/app.constants';

const CACHE_TTL_MS = METADATA_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
const TEST_URL = `${ANILIST_GRAPHQL_URL}`;
/** Drains the microtask queue so async interceptor Dexie reads can resolve before we expect HTTP requests. */
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const MOCK_BODY = { data: { Media: { id: 1 } } };

describe('metadataCacheInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([metadataCacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    httpMock.verify();
    await tanoshiDb.metadataCache.clear();
    vi.useRealTimers();
  });

  it('should pass through non-metadata requests unchanged', async () => {
    const promise = http.get('https://example.com/api/other').toPromise();
    httpMock.expectOne('https://example.com/api/other').flush({ ok: true });
    await promise;
  });

  it('should make a network request and cache the response on first fetch', async () => {
    const promise = http.post(TEST_URL, { query: 'test' }).toPromise();

    // The interceptor does an async Dexie read before calling next(request) —
    // poll until the request appears rather than counting microtask ticks.
    let req: ReturnType<typeof httpMock.expectOne>;
    await vi.waitFor(() => { req = httpMock.expectOne(TEST_URL); }, { timeout: 2000 });
    req!.flush(MOCK_BODY);
    await promise;

    await vi.waitFor(async () => {
      const count = await tanoshiDb.metadataCache.count();
      expect(count).toBe(1);
    }, { timeout: 1000 });
  });

  it('should serve a cached response without hitting the network when TTL is still valid', async () => {
    const cacheKey = `POST:${TEST_URL}:${JSON.stringify({ query: 'cached' })}`;
    await tanoshiDb.metadataCache.add({
      id: 'entry-1',
      url: cacheKey,
      responseBody: JSON.stringify(MOCK_BODY),
      cachedAt: new Date(),
    });

    const result = await http.post(TEST_URL, { query: 'cached' }).toPromise();

    httpMock.expectNone(TEST_URL);
    expect(result).toEqual(MOCK_BODY);
  });

  it('should make a fresh network request when the cached entry has expired', async () => {
    const cacheKey = `POST:${TEST_URL}:${JSON.stringify({ query: 'stale' })}`;
    const staleDate = new Date(Date.now() - CACHE_TTL_MS - 1000);
    await tanoshiDb.metadataCache.add({
      id: 'stale-1',
      url: cacheKey,
      responseBody: JSON.stringify({ data: { Media: { id: 999 } } }),
      cachedAt: staleDate,
    });

    const promise = http.post(TEST_URL, { query: 'stale' }).toPromise();

    // Stale path: read + delete (two Dexie ops) before next(request) — poll until ready.
    let req: ReturnType<typeof httpMock.expectOne>;
    await vi.waitFor(() => { req = httpMock.expectOne(TEST_URL); }, { timeout: 2000 });
    req!.flush(MOCK_BODY);
    const result = await promise;

    expect(result).toEqual(MOCK_BODY);
  });
});
