import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { from, of, switchMap, tap } from 'rxjs';
import { tanoshiDb } from '../../data/database/tanoshi-db';
import { ANILIST_GRAPHQL_URL, MANGADEX_API_URL, METADATA_CACHE_TTL_DAYS } from '../constants/app.constants';

const CACHE_TTL_MS = METADATA_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Tracks in-flight cache-write promises by cache key to prevent duplicate concurrent writes. */
const pendingWrites = new Map<string, Promise<void>>();

function isMetadataRequest(url: string): boolean {
  return url.startsWith(ANILIST_GRAPHQL_URL) || url.startsWith(MANGADEX_API_URL);
}

function buildCacheKey(request: Parameters<HttpInterceptorFn>[0]): string {
  const bodyPart = request.method === 'POST' ? JSON.stringify(request.body) : '';
  return `${request.method}:${request.url}:${bodyPart}`;
}

async function deleteStaleEntry(id: string): Promise<void> {
  await tanoshiDb.metadataCache.delete(id);
}

async function writeToCache(cacheKey: string, body: unknown): Promise<void> {
  if (pendingWrites.has(cacheKey)) return;
  const writePromise = tanoshiDb.transaction('rw', tanoshiDb.metadataCache, async () => {
    // Under the unique &url index a second write for the same key will throw;
    // use delete+add inside a transaction so only one row per URL ever exists.
    await tanoshiDb.metadataCache.where('url').equals(cacheKey).delete();
    await tanoshiDb.metadataCache.add({
      id: crypto.randomUUID(),
      url: cacheKey,
      responseBody: JSON.stringify(body),
      cachedAt: new Date(),
    });
  }).catch(() => {
    // Non-fatal: a concurrent write already stored the entry
  }).finally(() => {
    pendingWrites.delete(cacheKey);
  });
  pendingWrites.set(cacheKey, writePromise);
}

/**
 * Functional HTTP interceptor that caches AniList and MangaDex responses in
 * Dexie for METADATA_CACHE_TTL_DAYS to avoid redundant network requests.
 *
 * Concurrent requests for the same URL are deduplicated at the write level via
 * pendingWrites. Stale entries are deleted before re-fetching.
 */
export const metadataCacheInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isMetadataRequest(request.url)) {
    return next(request);
  }

  const cacheKey = buildCacheKey(request);

  return from(
    tanoshiDb.metadataCache.where('url').equals(cacheKey).first(),
  ).pipe(
    switchMap((cached) => {
      if (cached) {
        const ageMs = Date.now() - new Date(cached.cachedAt).getTime();
        if (ageMs < CACHE_TTL_MS) {
          return of(
            new HttpResponse({ status: 200, body: JSON.parse(cached.responseBody) }),
          );
        }
        // Await the delete so a concurrent request cannot read the stale row
        return from(deleteStaleEntry(cached.id)).pipe(
          switchMap(() => next(request).pipe(
            tap((event) => {
              if (event instanceof HttpResponse && event.status === 200) {
                void writeToCache(cacheKey, event.body);
              }
            }),
          )),
        );
      }

      return next(request).pipe(
        tap((event) => {
          if (event instanceof HttpResponse && event.status === 200) {
            void writeToCache(cacheKey, event.body);
          }
        }),
      );
    }),
  );
};
