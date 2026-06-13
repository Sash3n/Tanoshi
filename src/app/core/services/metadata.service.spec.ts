import { describe, it, expect, beforeEach, vi } from 'vitest';

/** Drains the microtask queue so sequential async calls can proceed. */
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MetadataService } from './metadata.service';
import { ANILIST_GRAPHQL_URL, MANGADEX_API_URL } from '../constants/app.constants';

const MOCK_ANILIST_RESPONSE = {
  data: {
    Media: {
      id: 42,
      title: { romaji: 'Berserk', english: 'Berserk', native: 'ベルセルク' },
      description: 'A dark fantasy epic.',
      genres: ['Action', 'Fantasy', 'Horror'],
      coverImage: { large: 'https://example.com/cover.jpg' },
      staff: {
        edges: [
          { role: 'Story & Art', node: { name: { full: 'Kentaro Miura' } } },
        ],
      },
    },
  },
};

const MOCK_MANGADEX_RESPONSE = {
  data: [
    {
      id: 'manga-uuid-123',
      attributes: {
        title: { en: 'Berserk' },
        description: { en: 'A dark fantasy epic.' },
        tags: [
          { attributes: { name: { en: 'Action' }, group: 'genre' } },
          { attributes: { name: { en: 'Fantasy' }, group: 'genre' } },
        ],
      },
      relationships: [
        { type: 'author', id: 'author-1', attributes: { name: 'Kentaro Miura' } },
        { type: 'artist', id: 'artist-1', attributes: { name: 'Kentaro Miura' } },
        { type: 'cover_art', id: 'cover-1', attributes: { fileName: 'cover.jpg' } },
      ],
    },
  ],
};

describe('MetadataService', () => {
  let service: MetadataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MetadataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchFromAniList', () => {
    it('should return metadata when AniList finds a result', async () => {
      const promise = service.fetchFromAniList('Berserk');
      const req = httpMock.expectOne(ANILIST_GRAPHQL_URL);
      req.flush(MOCK_ANILIST_RESPONSE);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.anilistId).toBe(42);
      expect(result?.genres).toContain('Action');
      expect(result?.synopsis).toBe('A dark fantasy epic.');
    });

    it('should return null when AniList returns no Media', async () => {
      const promise = service.fetchFromAniList('NonExistentTitle12345');
      const req = httpMock.expectOne(ANILIST_GRAPHQL_URL);
      req.flush({ data: { Media: null } });

      const result = await promise;
      expect(result).toBeNull();
    });

    it('should return null on HTTP error without throwing', async () => {
      const promise = service.fetchFromAniList('Berserk');
      const req = httpMock.expectOne(ANILIST_GRAPHQL_URL);
      req.error(new ProgressEvent('network error'));

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('fetchFromMangaDex', () => {
    it('should return metadata from MangaDex when a result is found', async () => {
      const promise = service.fetchFromMangaDex('Berserk');
      const req = httpMock.expectOne((r) => r.url.startsWith(MANGADEX_API_URL));
      req.flush(MOCK_MANGADEX_RESPONSE);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.mangaDexId).toBe('manga-uuid-123');
      expect(result?.author).toBe('Kentaro Miura');
      expect(result?.genres).toEqual(['Action', 'Fantasy']);
    });

    it('should return null when MangaDex returns an empty result array', async () => {
      const promise = service.fetchFromMangaDex('UnknownSeries');
      const req = httpMock.expectOne((r) => r.url.startsWith(MANGADEX_API_URL));
      req.flush({ data: [] });

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('fetchMetadata (AniList with MangaDex fallback)', () => {
    it('should return AniList result without calling MangaDex when AniList succeeds', async () => {
      const promise = service.fetchMetadata('Berserk');
      const anilistReq = httpMock.expectOne(ANILIST_GRAPHQL_URL);
      anilistReq.flush(MOCK_ANILIST_RESPONSE);

      const result = await promise;

      httpMock.expectNone((r) => r.url.startsWith(MANGADEX_API_URL));
      expect(result?.anilistId).toBe(42);
    });

    it('should fall back to MangaDex when AniList returns null', async () => {
      const promise = service.fetchMetadata('Berserk');

      // Flush AniList — returning null triggers the MangaDex fallback
      const anilistReq = httpMock.expectOne(ANILIST_GRAPHQL_URL);
      anilistReq.flush({ data: { Media: null } });

      // Allow the async continuation (fetchFromMangaDex call) to be queued
      await flushMicrotasks();

      const mangadexReq = httpMock.expectOne((r) => r.url.startsWith(MANGADEX_API_URL));
      mangadexReq.flush(MOCK_MANGADEX_RESPONSE);

      const result = await promise;
      expect(result?.mangaDexId).toBe('manga-uuid-123');
    });

    it('should return null when both AniList and MangaDex return no results', async () => {
      const promise = service.fetchMetadata('CompletelyUnknownTitle');

      const anilistReq = httpMock.expectOne(ANILIST_GRAPHQL_URL);
      anilistReq.flush({ data: { Media: null } });

      await flushMicrotasks();

      const mangadexReq = httpMock.expectOne((r) => r.url.startsWith(MANGADEX_API_URL));
      mangadexReq.flush({ data: [] });

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
