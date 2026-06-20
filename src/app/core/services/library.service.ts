import { Injectable, inject } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CbzExtractorService } from './cbz-extractor.service';
import { SeriesRepository } from '../../data/repositories/series.repository';
import { ChapterRepository } from '../../data/repositories/chapter.repository';
import { FileFormat } from '../../domain/enums/file-format.enum';
import type { ISeries } from '../../domain/models/series.model';
import type { IChapter } from '../../domain/models/chapter.model';
import { SUPPORTED_FILE_EXTENSIONS } from '../constants/storage.constants';

export interface IImportProgress {
  readonly fileName: string;
  readonly currentStep: string;
  readonly isComplete: boolean;
  readonly error: string | null;
}

/**
 * Orchestrates importing manga files into the library.
 * Delegates file unpacking to CbzExtractorService and persistence to repositories.
 */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly #cbzExtractor = inject(CbzExtractorService);
  readonly #seriesRepository = inject(SeriesRepository);
  readonly #chapterRepository = inject(ChapterRepository);

  /**
   * Imports a single manga file (CBZ/CBR/PDF) picked by the user.
   * Creates a series record if it does not yet exist, then adds a chapter record.
   * @param file The File object from the browser file picker.
   * @param onProgress Optional callback receiving progress updates.
   * @returns The id of the created or updated series.
   */
  async importFile(
    file: File,
    onProgress?: (progress: IImportProgress) => void,
  ): Promise<string> {
    const fileName = file.name;
    const fileFormat = this.#detectFileFormat(fileName);

    onProgress?.({ fileName, currentStep: 'Extracting pages...', isComplete: false, error: null });

    const extraction = await this.#cbzExtractor.extractFromFile(file);

    onProgress?.({ fileName, currentStep: 'Saving to library...', isComplete: false, error: null });

    const seriesTitle = this.#titleFromFileName(fileName);
    let seriesId: string;

    const existingSeries = await this.#seriesRepository.getAll().then(
      (allSeries) => allSeries.find((s) => s.title === seriesTitle),
    );

    if (existingSeries) {
      seriesId = existingSeries.id;
      await this.#seriesRepository.update(seriesId, {
        totalChapterCount: existingSeries.totalChapterCount + 1,
        coverImageBase64: extraction.coverImageBase64 ?? existingSeries.coverImageBase64,
        updatedAt: new Date(),
      });
    } else {
      const now = new Date();
      seriesId = await this.#seriesRepository.create({
        title: seriesTitle,
        alternativeTitles: [],
        coverImageBase64: extraction.coverImageBase64,
        totalChapterCount: 1,
        fileFormat,
        localFilePath: fileName,
        anilistId: null,
        mangaDexId: null,
        genres: [],
        synopsis: null,
        author: null,
        artist: null,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    const chapterData: Omit<IChapter, 'id'> = {
      seriesId,
      chapterNumber: await this.#nextChapterNumber(seriesId),
      volumeNumber: null,
      title: null,
      localFilePath: fileName,
      pageCount: extraction.pageCount,
      fileSizeBytes: file.size,
      importedAt: new Date(),
    };

    await this.#chapterRepository.create(chapterData);

    onProgress?.({ fileName, currentStep: 'Done', isComplete: true, error: null });
    return seriesId;
  }

  /**
   * Returns all series from the library ordered by creation date.
   */
  async getAllSeries(): Promise<ISeries[]> {
    return this.#seriesRepository.getAll();
  }

  /**
   * Deletes a series and all its associated chapters.
   * @param seriesId The id of the series to remove.
   */
  async deleteSeries(seriesId: string): Promise<void> {
    await this.#chapterRepository.deleteBySeriesId(seriesId);
    await this.#seriesRepository.delete(seriesId);
  }

  /**
   * Flips a series' favorite flag.
   * @param seriesId The id of the series to toggle.
   * @returns The favorite flag's new value.
   */
  async toggleFavorite(seriesId: string): Promise<boolean> {
    return this.#seriesRepository.toggleFavorite(seriesId);
  }

  /**
   * Checks whether the Capacitor Filesystem permission is granted on Android.
   * Returns true if we can proceed, false if the user denied.
   */
  async requestStoragePermission(): Promise<boolean> {
    try {
      const permission = await Filesystem.requestPermissions();
      return permission.publicStorage === 'granted';
    } catch {
      // On web/PWA the Filesystem plugin is not available — assume granted.
      return true;
    }
  }

  async #nextChapterNumber(seriesId: string): Promise<number> {
    const chapters = await this.#chapterRepository.getBySeriesId(seriesId);
    if (chapters.length === 0) return 1;
    return Math.max(...chapters.map((c) => c.chapterNumber)) + 1;
  }

  #titleFromFileName(fileName: string): string {
    return fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  #detectFileFormat(fileName: string): FileFormat {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(SUPPORTED_FILE_EXTENSIONS[0])) return FileFormat.CBZ;
    if (lowerName.endsWith(SUPPORTED_FILE_EXTENSIONS[1])) return FileFormat.CBR;
    return FileFormat.PDF;
  }
}
