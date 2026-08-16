import { Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

import { usePrefs } from '@/lib/store/prefs'

/**
 * The single owner of the routing decision.
 *
 * Auth state, onboarding state and the tab group are resolved in exactly one
 * place. The group layouts keep only a defensive signed-out redirect — if any
 * of them also decided the onboarding branch, the two would bounce the user
 * between each other, which is the most common expo-router failure mode.
 *
 * Both inputs are synchronous by the time this renders (Clerk from its cached
 * token, preferences from SQLite at module load), so there is no intermediate
 * state to flash.
 */
export default function RouteGate() {
    const { isLoaded, isSignedIn } = useAuth()
    const hydrated = usePrefs((state) => state.hydrated)
    const onboardingCompletedAt = usePrefs((state) => state.onboardingCompletedAt)

    // Splash is still up; render nothing rather than a wrong screen.
    if (!isLoaded || !hydrated) return null

    if (!isSignedIn) return <Redirect href="/sign-in" />
    // Cast: expo-router regenerates .expo/types on `expo start`, so newly added
    // routes are unknown to the compiler until the dev server has run once.
    if (!onboardingCompletedAt) return <Redirect href={'/countries' as never} />

    return <Redirect href="/(tabs)" />
}
