import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { COVER_IMAGE_MAX_DIMENSION_PX } from '../constants/storage.constants';

export interface IExtractedPage {
  readonly index: number;
  readonly blobUrl: string;
  readonly fileName: string;
}

export interface IExtractionResult {
  readonly pages: IExtractedPage[];
  readonly coverImageBase64: string | null;
  readonly pageCount: number;
}

/** Supported image MIME types inside CBZ archives. */
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * Unpacks CBZ (ZIP) archives and extracts page image blobs.
 * Page order is derived from alphabetical filename sort, matching standard manga readers.
 */
@Injectable({ providedIn: 'root' })
export class CbzExtractorService {
  /**
   * Extracts all page images from a CBZ file.
   * @param file The CBZ File object from the browser file picker or Capacitor.
   * @returns Ordered page blobs and a base64-encoded cover from page 1.
   */
  async extractFromFile(file: File): Promise<IExtractionResult> {
    const zip = await JSZip.loadAsync(file);
    return this.extractFromZip(zip);
  }

  /**
   * Extracts all page images from a CBZ given its raw ArrayBuffer.
   * @param buffer Raw bytes of the CBZ file.
   * @returns Ordered page blobs and a base64-encoded cover from page 1.
   */
  async extractFromBuffer(buffer: ArrayBuffer): Promise<IExtractionResult> {
    const zip = await JSZip.loadAsync(buffer);
    return this.extractFromZip(zip);
  }

  /**
   * Generates a base64-encoded cover thumbnail from the first page blob URL.
   * Scales the image down to COVER_IMAGE_MAX_DIMENSION_PX on its longest axis.
   * @param blobUrl Blob URL of the first page image.
   * @returns Base64 data URL of the resized cover.
   */
  async generateCoverFromBlobUrl(blobUrl: string): Promise<string> {
    return this.resizeImageToBase64(blobUrl);
  }

  async extractFromZip(zip: JSZip): Promise<IExtractionResult> {
    const imageFiles = Object.values(zip.files)
      .filter((f) => !f.dir && IMAGE_EXTENSIONS.test(f.name))
      .sort((fileA, fileB) => fileA.name.localeCompare(fileB.name, undefined, { numeric: true }));

    const pages: IExtractedPage[] = await Promise.all(
      imageFiles.map(async (zipEntry, index) => {
        const blob = await zipEntry.async('blob');
        const typedBlob = blob.type && IMAGE_MIME_TYPES.has(blob.type)
          ? blob
          : new Blob([blob], { type: this.mimeTypeFromFileName(zipEntry.name) });
        const blobUrl = URL.createObjectURL(typedBlob);
        return { index, blobUrl, fileName: zipEntry.name };
      }),
    );

    let coverImageBase64: string | null = null;
    if (pages.length > 0) {
      coverImageBase64 = await this.resizeImageToBase64(pages[0].blobUrl);
    }

    return { pages, coverImageBase64, pageCount: pages.length };
  }

  protected mimeTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      gif: 'image/gif',
    };
    return mimeMap[extension ?? ''] ?? 'image/jpeg';
  }

  async resizeImageToBase64(blobUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = COVER_IMAGE_MAX_DIMENSION_PX;
        const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.onerror = () => reject(new Error(`Failed to load image from blob URL: ${blobUrl}`));
      image.src = blobUrl;
    });
  }
}
