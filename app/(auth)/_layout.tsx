import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

import { colors } from '@/theme/tokens'

export default function AuthRoutesLayout() {
    const { isSignedIn } = useAuth()

    if (isSignedIn) {
        return <Redirect href={'/'} />
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.ink },
            }}
        >
            <Stack.Screen name="sign-in" />
        </Stack>
    )
}
