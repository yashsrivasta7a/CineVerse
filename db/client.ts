import * as SQLite from 'expo-sqlite';

/**
 * Local database.
 *
 * expo-sqlite's synchronous API is what makes the onboarding gate flash-free:
 * `app/index.tsx` has to know whether onboarding is done *before* the first
 * render, and an async read would show the wrong screen for a frame.
 *
 * One engine, not two — this is also what backs the persisted React Query
 * cache, so there is no separate key-value store to keep in sync.
 */
export const db = SQLite.openDatabaseSync('kinoroy.db');

/** Tables and indexes as of v1. `IF NOT EXISTS` throughout, so it is re-runnable. */
const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS prefs (
  facet      TEXT    NOT NULL,          -- country | genre | person
  value      TEXT    NOT NULL,          -- iso code | genre id | person id
  stance     TEXT    NOT NULL,          -- like | dislike | block
  label      TEXT,                      -- cached name, so chips need no refetch
  image_path TEXT,
  updated_at INTEGER NOT NULL,
  synced     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (facet, value)
);

CREATE TABLE IF NOT EXISTS verdicts (
  media_type TEXT    NOT NULL,
  tmdb_id    INTEGER NOT NULL,
  verdict    TEXT    NOT NULL,          -- up | down | skip
  reaction   TEXT,
  created_at INTEGER NOT NULL,
  synced     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (media_type, tmdb_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  media_type TEXT    NOT NULL,
  tmdb_id    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  synced     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (media_type, tmdb_id)
);

CREATE TABLE IF NOT EXISTS watched_episodes (
  tv_id   INTEGER NOT NULL,
  season  INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  watched_at INTEGER NOT NULL,
  PRIMARY KEY (tv_id, season, episode)
);
`;

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_prefs_facet_stance ON prefs (facet, stance);
CREATE INDEX IF NOT EXISTS idx_verdicts_synced    ON verdicts (synced);
CREATE INDEX IF NOT EXISTS idx_bookmarks_synced   ON bookmarks (synced);
`;

/**
 * Every column added to a v1 table after v1 shipped, as
 * `[table, column, definition]`.
 *
 * This list — not the migration that introduced each one — is the authority on
 * what the schema must look like, and it is re-asserted on every boot by
 * `repairSchema()`. That redundancy exists because `PRAGMA user_version` only
 * records *how far the ledger got*, not what the tables actually contain, and
 * the two can come apart:
 *
 *   - A shipped migration gets edited (a second `ALTER TABLE` appended to an
 *     entry a device has already run and recorded). The version is satisfied;
 *     the column never arrives.
 *   - A multi-statement `execSync` aborts partway. Earlier statements have
 *     committed, the version bump has not, and the retry now fails on the
 *     duplicate column it added the first time — permanently stuck.
 *
 * Both were live in this database: `bookmarks.deleted` existed and
 * `bookmarks.title` did not, so every `addBookmarkLocal` threw
 * "table bookmarks has no column named title" — silently, because the only
 * caller of `initDatabase` catches and degrades.
 */
const ADDITIVE_COLUMNS: readonly (readonly [string, string, string])[] = [
  ['bookmarks', 'deleted', 'INTEGER NOT NULL DEFAULT 0'],
  ['bookmarks', 'title', 'TEXT'],
] as const;

/**
 * Append-only list. Each entry is one schema version; never edit or reorder a
 * shipped entry, only add to the end. Entries must also be safe to re-run —
 * `repairSchema()` is the safety net, not an excuse for a destructive step.
 */
const MIGRATIONS: readonly (() => void)[] = [
  // v1 — preferences, verdicts, library, and a generic key-value table.
  () => {
    db.execSync(BASE_SCHEMA);
    db.execSync(INDEXES);
  },

  // v2 — bookmark tombstones and titles.
  //
  // `deleted`: removing a bookmark offline used to delete the local row
  // outright, which threw away the intent — the next reconcile saw a row
  // present remotely and absent locally, read that as "added on another
  // device", and put it back. The flag keeps the row as an outbox entry until
  // the delete has actually reached Appwrite.
  //
  // `title`: the Appwrite document carries one, so a queued addition has to be
  // able to supply it without a TMDB round trip it may have no network for.
  () => {
    applyAdditiveColumns();
    db.execSync(INDEXES);
  },
];

/** Column names on a table, or an empty set if the table does not exist yet. */
function columnsOf(table: string): Set<string> {
  try {
    // PRAGMA takes no bound parameters. Every caller passes a literal from
    // ADDITIVE_COLUMNS — never anything that reaches this from outside.
    const rows = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
    return new Set(rows.map((row) => row.name));
  } catch {
    return new Set();
  }
}

/**
 * Adds any missing column from `ADDITIVE_COLUMNS`.
 *
 * Per-column, and per-column-tolerant: one table failing must not stop the
 * others from being repaired, because the caller upstream degrades to empty
 * preferences on a throw and the user would silently re-run onboarding.
 */
function applyAdditiveColumns(): void {
  for (const [table, column, definition] of ADDITIVE_COLUMNS) {
    const existing = columnsOf(table);
    // Empty means the table itself is absent — v1 creates it, and this same
    // pass runs again immediately afterwards.
    if (existing.size === 0 || existing.has(column)) continue;

    try {
      db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      console.warn(`[db] could not add ${table}.${column}:`, error);
    }
  }
}

/**
 * Re-asserts the current schema regardless of `user_version`, healing databases
 * whose recorded version ran ahead of their actual tables. Cheap: a handful of
 * PRAGMA reads and `CREATE INDEX IF NOT EXISTS` on an already-open handle.
 */
function repairSchema(): void {
  applyAdditiveColumns();
  db.execSync(INDEXES);
}

let initialised = false;

/**
 * Brings the database up to the latest schema. Safe to call repeatedly; the
 * work runs at most once per process.
 */
export function initDatabase(): void {
  if (initialised) return;

  db.execSync('PRAGMA journal_mode = WAL');
  db.execSync('PRAGMA foreign_keys = ON');

  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version += 1) {
    MIGRATIONS[version]();
    // PRAGMA does not accept bound parameters, and `version` is a loop counter
    // over a local array — never user input.
    db.execSync(`PRAGMA user_version = ${version + 1}`);
  }

  repairSchema();

  // Set last: a throw above must leave this false so the next call retries
  // rather than handing out a half-migrated database for the rest of the
  // process lifetime.
  initialised = true;
}
