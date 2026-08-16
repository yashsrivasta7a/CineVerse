import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

import { colors } from '@/theme/tokens'

/**
 * Onboarding only ever needs a defensive signed-out redirect. It must NOT
 * re-implement the "has the user finished onboarding?" branch — that decision
 * lives in exactly one place (`app/index.tsx`), and duplicating it across group
 * layouts is the classic way to produce an expo-router redirect loop.
 */
export default function OnboardingLayout() {
    const { isLoaded, isSignedIn } = useAuth()

    if (!isLoaded) return null
    if (!isSignedIn) return <Redirect href="/sign-in" />

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: colors.blood },
            }}
        />
    )
}
