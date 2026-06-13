import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { from, of, switchMap, tap } from 'rxjs';
import { tanoshiDb } from '../../data/database/tanoshi-db';
import { ANILIST_GRAPHQL_URL, MANGADEX_API_URL, METADATA_CACHE_TTL_DAYS } from '../constants/app.constants';

const CACHE_TTL_MS = METADATA_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

function isMetadataRequest(url: string): boolean {
  return url.startsWith(ANILIST_GRAPHQL_URL) || url.startsWith(MANGADEX_API_URL);
}

function buildCacheKey(request: Parameters<HttpInterceptorFn>[0]): string {
  const bodyPart = request.method === 'POST' ? JSON.stringify(request.body) : '';
  return `${request.method}:${request.url}:${bodyPart}`;
}

/**
 * Functional HTTP interceptor that caches AniList and MangaDex responses in
 * Dexie for METADATA_CACHE_TTL_DAYS to avoid redundant network requests.
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
        void tanoshiDb.metadataCache.delete(cached.id);
      }

      return next(request).pipe(
        tap((event) => {
          if (event instanceof HttpResponse && event.status === 200) {
            void tanoshiDb.metadataCache
              .add({
                id: crypto.randomUUID(),
                url: cacheKey,
                responseBody: JSON.stringify(event.body),
                cachedAt: new Date(),
              })
              .catch(() => {
                // Non-fatal: cache write failure does not affect the response
              });
          }
        }),
      );
    }),
  );
};
