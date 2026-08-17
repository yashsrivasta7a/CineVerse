import { useOAuth } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'

import { Screen } from '@/components/ui/Screen'
import { Text } from '@/components/ui/Text'
import { Display } from '@/components/ui/Display'
import { DashedCard } from '@/components/kino/DashedCard'
import { FilmStrip } from '@/components/kino/FilmStrip'
import { Barcode } from '@/components/kino/Barcode'
import { colors, grid, radius, withAlpha } from '@/theme/tokens'

const useWarmUpBrowser = () => {
    useEffect(() => {
        if (Platform.OS !== 'android') return
        void WebBrowser.warmUpAsync()
        return () => {
            void WebBrowser.coolDownAsync()
        }
    }, [])
}

WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
    useWarmUpBrowser()
    const router = useRouter()
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const onGooglePress = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
                redirectUrl: Linking.createURL('/'),
            })

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId })
                router.replace('/')
                return
            }

            // An existing account comes back as a transferable signUp.
            if ((signUp?.status as string) === 'transferable' && signIn) {
                const response = await signIn.create({ transfer: true })
                if (response.createdSessionId && setActive) {
                    await setActive({ session: response.createdSessionId })
                    router.replace('/')
                    return
                }
            }

            if ((signIn?.status as string) === 'transferable' && signUp) {
                const response = await signUp.create({ transfer: true })
                if (response.createdSessionId && setActive) {
                    await setActive({ session: response.createdSessionId })
                    router.replace('/')
                    return
                }
            }

            setError('Sign in was not completed. Please try again.')
        } catch (err: any) {
            const message =
                err?.errors?.[0]?.longMessage ||
                err?.errors?.[0]?.message ||
                'Something went wrong. Please try again.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }, [startOAuthFlow, router])

    return (
        <Screen
            background={colors.ink}
            edges={['top', 'bottom']}
        >
            <StatusBar style="light" />

            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    paddingHorizontal: grid.screenPadding,
                    paddingVertical: 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Masthead */}
                <View style={{ alignItems: 'center', gap: 2, marginBottom: 8 }}>
                    <Display variant="displayXl" align="center">KINOROY</Display>
                    <Text
                        variant="script"
                        color={colors.blood}
                        style={{ transform: [{ rotate: '-4deg' }] }}
                    >
                        Filmder Cinema
                    </Text>
                </View>

                <FilmStrip height={12} pitch={18} style={{ marginVertical: 20 }} />

                {/* Login card */}
                <DashedCard contentStyle={{ padding: 20, gap: 18 }}>
                    <View style={{ alignItems: 'center', gap: 10 }}>
                        <Display variant="displaySm" color={colors.paper} align="center">
                            For good recommendations, sign in
                        </Display>

                        <Text
                            variant="bodySm"
                            color={withAlpha(colors.paper, 0.85)}
                            style={{ textAlign: 'center' }}
                        >
                            Your vault, moods and picks follow you across devices.
                        </Text>
                    </View>

                    {error ? (
                        <View
                            style={{
                                padding: 10,
                                borderRadius: radius.sm,
                                backgroundColor: colors.bloodDeep,
                                borderWidth: 1,
                                borderColor: withAlpha(colors.paper, 0.4),
                            }}
                        >
                            <Text
                                variant="bodySm"
                                color={colors.paper}
                                style={{ textAlign: 'center' }}
                            >
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    <Pressable
                        onPress={onGooglePress}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="Continue with Google"
                        accessibilityState={{ disabled: loading }}
                        style={({ pressed }) => ({
                            height: 54,
                            borderRadius: radius.md,
                            backgroundColor: colors.noir,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            opacity: loading ? 0.65 : 1,
                            transform: [{ translateY: pressed ? 2 : 0 }],
                        })}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.paper} />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={18} color={colors.paper} />
                                <Text variant="label" color={colors.paper}>
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </Pressable>

                    <View style={{ alignItems: 'center', gap: 8 }}>
                        <Barcode value="kinoroy-admit-one" height={24} bars={26} color={colors.paper} />
                        <Text variant="osd" color={withAlpha(colors.paper, 0.75)}>
                            Admit one
                        </Text>
                    </View>
                </DashedCard>

                <Text
                    variant="osd"
                    color={withAlpha(colors.paper, 0.4)}
                    style={{ textAlign: 'center', marginTop: 22 }}
                >
                    By continuing you agree to our terms
                </Text>
            </ScrollView>
        </Screen>
    )
}
