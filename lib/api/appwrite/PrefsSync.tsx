import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { usePrefs } from '@/lib/store/prefs';
import { isAppwriteSessionActive } from './session';
import { pushPrefs, type PrefsSnapshot } from './prefs';

/**
 * Mirrors local preferences up to Appwrite.
 *
 * Renders nothing. Pushes when the app goes to the background, and 30 seconds
 * after the last change — never on every keystroke of a taste edit, which
 * would be a write per tap during onboarding.
 *
 * Silent by design: a failed backup must not interrupt anything, because the
 * local database already holds the authoritative copy.
 */
const DEBOUNCE_MS = 30_000;

export function PrefsSync() {
  const entries = usePrefs((state) => state.entries);
  const mood = usePrefs((state) => state.mood);
  const onboardingCompletedAt = usePrefs((state) => state.onboardingCompletedAt);

  const snapshotRef = useRef<PrefsSnapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  snapshotRef.current = {
    version: 1,
    updatedAt: Date.now(),
    onboardingCompletedAt,
    mood,
    entries: Object.values(entries).map(
      (entry) => `${entry.facet}:${entry.value}:${entry.stance}:${entry.label ?? ''}`
    ),
  };

  // Debounced push on change.
  useEffect(() => {
    if (!isAppwriteSessionActive()) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (snapshotRef.current) void pushPrefs(snapshotRef.current);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [entries, mood, onboardingCompletedAt]);

  // Flush on background — the one moment a pending change would otherwise be
  // lost if the process is reclaimed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return;
      if (!isAppwriteSessionActive()) return;
      if (snapshotRef.current) void pushPrefs(snapshotRef.current);
    });

    return () => subscription.remove();
  }, []);

  return null;
}

export default PrefsSync;
