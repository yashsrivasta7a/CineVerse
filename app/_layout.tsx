import { useEffect } from "react";
import { Stack } from "expo-router";
import "./global.css";
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
import { StatusBar } from "expo-status-bar";
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { NavigationBar } from 'expo-navigation-bar'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

import { PrefsSync } from '@/lib/api/appwrite/PrefsSync'
import { AppwriteSessionBridge } from '@/lib/api/appwrite/SessionBridge'
import { tokenCache } from '@/lib/auth/token-cache'
import { env } from '@/lib/env'
import { queryClient } from '@/lib/queries/client'
import {
  CACHE_BUSTER,
  CACHE_MAX_AGE,
  queryPersister,
} from '@/lib/storage/query-persister'
import { colors } from '@/theme/tokens'

// Hold the splash until the faces are ready, so nothing renders in the fallback
// font and then reflows.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (fast refresh) — nothing to do.
})

export default function RootLayout() {
  /**
   * Fonts are loaded at RUNTIME here as well as being embedded natively by the
   * expo-font config plugin in app.json. That redundancy is deliberate:
   *
   * - The config plugin only copies the files during `expo prebuild`, so a
   *   dev client built before the plugin was added will never contain them,
   *   no matter how many times Metro reloads. That is a genuinely confusing
   *   failure — the config is correct, the app just silently uses the fallback.
   * - `useFonts` goes through Metro's asset pipeline instead, so the faces
   *   appear on a plain reload with no native rebuild.
   *
   * Once a build does include them natively, this call resolves immediately and
   * costs nothing. Relative paths, not the `@/` alias — Metro resolves these at
   * bundle time and the alias is not worth the risk here.
   */
  const [fontsLoaded, fontError] = useFonts({
    'Thunder-BlackLC': require('../assets/fonts/Thunder-BlackLC.ttf'),
    'Thunder-BoldLC': require('../assets/fonts/Thunder-BoldLC.ttf'),
  })

  const ready = fontsLoaded || !!fontError

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {})
  }, [ready])

  useEffect(() => {
    if (fontError) {
      // Never block the app on a font: fall through to the system face and say
      // so, rather than showing an indefinite splash.
      console.warn('[fonts] Thunder failed to load, using system fallback:', fontError)
    }
  }, [fontError])

  if (!ready) return null

  return (
    // Required for react-native-gesture-handler. Without this wrapper, pan
    // gestures silently no-op on Android — which the Filmder deck depends on.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: CACHE_MAX_AGE,
            buster: CACHE_BUSTER,
          }}
        >
          <ClerkLoaded>
            {/* Bridges Clerk identity into an Appwrite session, so per-document
                permissions have an owner to attach to. Renders nothing. */}
            <AppwriteSessionBridge />
            {/* Mirrors local preferences to Appwrite so a reinstall restores
                taste instead of re-running onboarding. Renders nothing. */}
            <PrefsSync />
            <StatusBar hidden />
            {/*
              Android's system navigation goes away too, so the floating tab bar
              is the only chrome at the bottom of the screen — which is the whole
              point of its shape. It stays swipe-reachable: Android shows it as a
              transient overlay on an edge swipe and re-hides it on its own, so
              nothing becomes unreachable.

              No-op on iOS — the component renders null there.
            */}
            <NavigationBar hidden style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.ink },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="movies/[id]" />

              {/* Search is a verb, not a destination — it opens over whatever
                  you were looking at rather than owning a tab. */}
              <Stack.Screen name="search" options={{ presentation: 'modal' }} />
              <Stack.Screen name="mood" options={{ presentation: 'modal' }} />
              <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
              <Stack.Screen name="upcoming" />
              <Stack.Screen name="collection/[slug]" />
              <Stack.Screen name="tv/[id]" />
              <Stack.Screen name="tv/[id]/season/[season]" />
              <Stack.Screen name="tv/[id]/season/[season]/episode/[episode]" />
              <Stack.Screen name="person/[id]" />
            </Stack>
          </ClerkLoaded>
        </PersistQueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  )
}
