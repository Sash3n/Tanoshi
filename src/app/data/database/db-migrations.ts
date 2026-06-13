import type { TanoshiDatabase } from './tanoshi-db';

/**
 * Applies any schema migrations beyond version 1.
 * Add new version blocks here as the schema evolves.
 */
export function applyMigrations(_db: TanoshiDatabase): void {
  // v1 schema is defined in TanoshiDatabase constructor.
  // Future migrations will be registered here.
}
