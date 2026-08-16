/**
 * Validated environment access.
 *
 * Expo only inlines `process.env.EXPO_PUBLIC_*` when it appears as a literal
 * static member expression. Dynamic access (`process.env[someKey]`) is NOT
 * inlined and silently yields `undefined` in a release bundle — so every key
 * below is spelled out longhand on purpose. Do not refactor this into a loop.
 */

const values = {
  tmdbReadToken: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  appwriteEndpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  appwriteProjectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  appwriteDatabaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  appwriteMetricsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID,
  /**
   * Previously hardcoded as the string 'bookmarks' in services/appwrite.ts.
   * Overridable now, with the old literal as the default so existing
   * deployments keep working.
   */
  appwriteBookmarksCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_BOOKMARKS_COLLECTION_ID ?? 'bookmarks',
  /** Per-user preference documents, keyed by the Appwrite user id. */
  appwritePrefsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PREFS_COLLECTION_ID ?? 'user_prefs',
  /** Swipe verdicts from the Filmder deck. */
  appwriteSwipesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_SWIPES_COLLECTION_ID ?? 'swipes',
  /**
   * Appwrite Function that mints an Appwrite session from a Clerk JWT.
   * Optional: without it the client falls back to unauthenticated access.
   */
  appwriteSessionFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_SESSION_FUNCTION_ID ?? '',
  /**
   * Optional server-side TMDB proxy. When set, no TMDB token ships in the
   * bundle at all — see functions/tmdb-proxy/README.md.
   */
  tmdbProxyUrl: process.env.EXPO_PUBLIC_TMDB_PROXY_URL ?? '',
} as const;

/** Field name -> the .env key a developer actually has to add. */
const ENV_KEY_OF: Record<keyof typeof values, string> = {
  tmdbReadToken: 'EXPO_PUBLIC_MOVIE_API_KEY',
  clerkPublishableKey: 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  appwriteEndpoint: 'EXPO_PUBLIC_APPWRITE_ENDPOINT',
  appwriteProjectId: 'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
  appwriteDatabaseId: 'EXPO_PUBLIC_APPWRITE_DATABASE_ID',
  appwriteMetricsCollectionId: 'EXPO_PUBLIC_APPWRITE_COLLECTION_ID',
  appwriteBookmarksCollectionId: 'EXPO_PUBLIC_APPWRITE_BOOKMARKS_COLLECTION_ID',
  appwritePrefsCollectionId: 'EXPO_PUBLIC_APPWRITE_PREFS_COLLECTION_ID',
  appwriteSwipesCollectionId: 'EXPO_PUBLIC_APPWRITE_SWIPES_COLLECTION_ID',
  appwriteSessionFunctionId: 'EXPO_PUBLIC_APPWRITE_SESSION_FUNCTION_ID',
  tmdbProxyUrl: 'EXPO_PUBLIC_TMDB_PROXY_URL',
};

const REQUIRED = [
  'tmdbReadToken',
  'clerkPublishableKey',
  'appwriteEndpoint',
  'appwriteProjectId',
  'appwriteDatabaseId',
  'appwriteMetricsCollectionId',
] as const satisfies readonly (keyof typeof values)[];

const missing = REQUIRED.filter((field) => !values[field]).map(
  (field) => ENV_KEY_OF[field]
);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable${missing.length > 1 ? 's' : ''}: ` +
      `${missing.join(', ')}.\n` +
      `Add ${missing.length > 1 ? 'them' : 'it'} to .env, then restart the ` +
      `bundler with \`npx expo start --clear\` — env values are inlined at ` +
      `build time and a warm cache will keep serving the old bundle.`
  );
}

export const env = values as {
  [K in keyof typeof values]: K extends (typeof REQUIRED)[number]
    ? string
    : (typeof values)[K];
};
