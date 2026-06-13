import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ANILIST_GRAPHQL_URL, MANGADEX_API_URL } from '../constants/app.constants';
import type { ISeriesMetadata } from '../../domain/models/metadata.model';

interface IAniListMediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

interface IAniListMedia {
  id: number;
  title: IAniListMediaTitle;
  description: string | null;
  genres: string[];
  coverImage: { large: string | null };
  staff: {
    edges: Array<{
      role: string;
      node: { name: { full: string } };
    }>;
  };
}

interface IAniListResponse {
  data: { Media: IAniListMedia | null };
  errors?: Array<{ message: string }>;
}

interface IMangaDexAuthor {
  id: string;
  attributes: { name: string; fileName?: string };
}

interface IMangaDexManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    tags: Array<{ attributes: { name: Record<string, string>; group: string } }>;
    authors?: IMangaDexAuthor[];
  };
  relationships: Array<{ type: string; id: string; attributes?: { name: string; fileName?: string } }>;
}

interface IMangaDexSearchResponse {
  data: IMangaDexManga[];
}

const ANILIST_QUERY = `
query ($title: String) {
  Media(search: $title, type: MANGA, sort: SEARCH_MATCH) {
    id
    title { romaji english native }
    description(asHtml: false)
    genres
    coverImage { large }
    staff(perPage: 4) {
      edges {
        role
        node { name { full } }
      }
    }
  }
}
`.trim();

/**
 * Fetches series metadata from AniList GraphQL, falling back to MangaDex REST v5
 * when AniList returns no result. Both APIs are public and require no authentication.
 */
@Injectable({ providedIn: 'root' })
export class MetadataService {
  readonly #http = inject(HttpClient);

  /**
   * Fetches metadata for a manga series by title.
   * Tries AniList first; if not found, tries MangaDex as a fallback.
   * @param seriesTitle The title to search for.
   * @returns Populated ISeriesMetadata, or null if neither source has a match.
   */
  async fetchMetadata(seriesTitle: string): Promise<ISeriesMetadata | null> {
    const anilistResult = await this.#fetchFromAniList(seriesTitle);
    if (anilistResult) return anilistResult;
    return this.#fetchFromMangaDex(seriesTitle);
  }

  /**
   * Queries the AniList GraphQL API for a manga matching the given title.
   * @param seriesTitle Title to search.
   * @returns Metadata or null if not found or on error.
   */
  async fetchFromAniList(seriesTitle: string): Promise<ISeriesMetadata | null> {
    return this.#fetchFromAniList(seriesTitle);
  }

  /**
   * Queries the MangaDex REST v5 API for a manga matching the given title.
   * @param seriesTitle Title to search.
   * @returns Metadata or null if not found or on error.
   */
  async fetchFromMangaDex(seriesTitle: string): Promise<ISeriesMetadata | null> {
    return this.#fetchFromMangaDex(seriesTitle);
  }

  async #fetchFromAniList(seriesTitle: string): Promise<ISeriesMetadata | null> {
    try {
      const response = await firstValueFrom(
        this.#http.post<IAniListResponse>(ANILIST_GRAPHQL_URL, {
          query: ANILIST_QUERY,
          variables: { title: seriesTitle },
        }),
      );

      const media = response.data?.Media;
      if (!media) return null;

      const author = media.staff.edges.find((e) =>
        e.role.toLowerCase().includes('story'),
      )?.node.name.full ?? null;

      const artist = media.staff.edges.find((e) =>
        e.role.toLowerCase().includes('art'),
      )?.node.name.full ?? null;

      return {
        anilistId: media.id,
        mangaDexId: null,
        coverImageUrl: media.coverImage.large,
        synopsis: media.description,
        genres: media.genres,
        author,
        artist,
        fetchedAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  async #fetchFromMangaDex(seriesTitle: string): Promise<ISeriesMetadata | null> {
    try {
      const searchUrl = `${MANGADEX_API_URL}/manga?title=${encodeURIComponent(seriesTitle)}&limit=1&includes[]=author&includes[]=artist&includes[]=cover_art`;
      const response = await firstValueFrom(
        this.#http.get<IMangaDexSearchResponse>(searchUrl),
      );

      const manga = response.data?.[0];
      if (!manga) return null;

      const synopsis = manga.attributes.description['en'] ?? Object.values(manga.attributes.description)[0] ?? null;

      const genres = manga.attributes.tags
        .filter((tag) => tag.attributes.group === 'genre')
        .map((tag) => tag.attributes.name['en'] ?? Object.values(tag.attributes.name)[0])
        .filter(Boolean);

      const authorRel = manga.relationships.find((r) => r.type === 'author');
      const artistRel = manga.relationships.find((r) => r.type === 'artist');

      const coverRel = manga.relationships.find((r) => r.type === 'cover_art');
      const coverFileName = coverRel?.attributes?.fileName;
      const coverImageUrl = coverFileName
        ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
        : null;

      return {
        anilistId: null,
        mangaDexId: manga.id,
        coverImageUrl,
        synopsis,
        genres,
        author: authorRel?.attributes?.name ?? null,
        artist: artistRel?.attributes?.name ?? null,
        fetchedAt: new Date(),
      };
    } catch {
      return null;
    }
  }
}
