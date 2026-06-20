/** Current shape version written to exported backup files. */
export const BACKUP_FORMAT_VERSION = 1;

/**
 * Hard cap on an imported backup file's size, checked before the file is
 * read into memory. Guards against pathological/corrupted files exhausting
 * memory during JSON.parse.
 */
export const MAX_BACKUP_FILE_SIZE_BYTES = 25 * 1024 * 1024;
