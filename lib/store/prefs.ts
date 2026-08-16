import { create } from 'zustand';

import { initDatabase } from '@/db/client';
import {
  KV_MOOD,
  KV_ONBOARDING_COMPLETED_AT,
  clearAllPrefs,
  clearStance,
  getKv,
  readAllPrefs,
  setKv,
  setStance,
  type PrefFacet,
  type PrefStance,
} from '@/db/queries/prefs';

export interface PrefEntry {
  facet: PrefFacet;
  value: string;
  stance: PrefStance;
  label: string | null;
  imagePath: string | null;
}

const keyOf = (facet: PrefFacet, value: string) => `${facet}:${value}`;

interface PrefsState {
  /** True once the SQLite read has run — see the note on hydration below. */
  hydrated: boolean;
  onboardingCompletedAt: number | null;
  /**
   * Index into MOOD_STOPS, or null for "no mood set".
   *
   * Persisted, because it is a real filter on what the deck and the rails show
   * — not a transient UI toggle. Changing it changes the deck's params hash,
   * which resets the deck.
   */
  mood: number | null;
  entries: Record<string, PrefEntry>;
  setMood: (index: number | null) => void;

  setStance: (
    facet: PrefFacet,
    value: string,
    stance: PrefStance,
    label?: string | null,
    imagePath?: string | null
  ) => void;
  /** Applying the stance a value already holds clears it. */
  toggleStance: (
    facet: PrefFacet,
    value: string,
    stance: PrefStance,
    label?: string | null,
    imagePath?: string | null
  ) => void;
  clear: (facet: PrefFacet, value: string) => void;
  completeOnboarding: () => void;
  resetAll: () => void;
}

/**
 * Reads the whole preference set synchronously at module load.
 *
 * This has to be synchronous: `app/index.tsx` decides between auth, onboarding
 * and the tabs before the first paint, and an async read would flash the wrong
 * screen. The set is small (tens of rows), so the cost is negligible.
 *
 * A failure here must not white-screen the app, so it degrades to empty
 * preferences — the visible consequence is that onboarding runs again, which is
 * recoverable, unlike a crash at import time.
 */
function bootstrap(): Pick<
  PrefsState,
  'hydrated' | 'onboardingCompletedAt' | 'entries' | 'mood'
> {
  try {
    initDatabase();

    const entries: Record<string, PrefEntry> = {};
    for (const row of readAllPrefs()) {
      entries[keyOf(row.facet, row.value)] = {
        facet: row.facet,
        value: row.value,
        stance: row.stance,
        label: row.label,
        imagePath: row.image_path,
      };
    }

    const completedAt = getKv(KV_ONBOARDING_COMPLETED_AT);
    const storedMood = getKv(KV_MOOD);

    return {
      hydrated: true,
      onboardingCompletedAt: completedAt ? Number(completedAt) : null,
      mood: storedMood === null || storedMood === '' ? null : Number(storedMood),
      entries,
    };
  } catch (error) {
    console.warn('[prefs] could not read local database, starting empty:', error);
    return { hydrated: true, onboardingCompletedAt: null, mood: null, entries: {} };
  }
}

export const usePrefs = create<PrefsState>((set, get) => ({
  ...bootstrap(),

  setStance: (facet, value, stance, label, imagePath) => {
    setStance(facet, value, stance, label, imagePath);
    set((state) => ({
      entries: {
        ...state.entries,
        [keyOf(facet, value)]: {
          facet,
          value,
          stance,
          label: label ?? null,
          imagePath: imagePath ?? null,
        },
      },
    }));
  },

  toggleStance: (facet, value, stance, label, imagePath) => {
    const existing = get().entries[keyOf(facet, value)];
    if (existing?.stance === stance) {
      get().clear(facet, value);
      return;
    }
    get().setStance(facet, value, stance, label, imagePath);
  },

  clear: (facet, value) => {
    clearStance(facet, value);
    set((state) => {
      const next = { ...state.entries };
      delete next[keyOf(facet, value)];
      return { entries: next };
    });
  },

  setMood: (index) => {
    setKv(KV_MOOD, index === null ? null : String(index));
    set({ mood: index });
  },

  completeOnboarding: () => {
    const now = Date.now();
    setKv(KV_ONBOARDING_COMPLETED_AT, String(now));
    set({ onboardingCompletedAt: now });
  },

  resetAll: () => {
    clearAllPrefs();
    setKv(KV_ONBOARDING_COMPLETED_AT, null);
    setKv(KV_MOOD, null);
    set({ entries: {}, onboardingCompletedAt: null, mood: null });
  },
}));

/* ------------------------------------------------------------- selectors */

export function useStanceOf(facet: PrefFacet, value: string): PrefStance | undefined {
  return usePrefs((state) => state.entries[keyOf(facet, value)]?.stance);
}

export function selectByFacet(
  entries: Record<string, PrefEntry>,
  facet: PrefFacet,
  stance: PrefStance
): PrefEntry[] {
  return Object.values(entries).filter(
    (entry) => entry.facet === facet && entry.stance === stance
  );
}
