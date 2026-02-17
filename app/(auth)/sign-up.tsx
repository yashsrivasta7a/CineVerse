import { useOAuth } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { Link, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import React, { useCallback, useEffect, useState } from 'react'
import {
    Platform,
    Pressable,
    Text,
    View,
    ActivityIndicator,
    Image,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { icons } from '@/constants/icons'
import AuroraBackground from '@/components/AuroraBackground'

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

export default function SignUpScreen() {
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

            console.log('=== SignUp OAuth Debug ===')
            console.log('createdSessionId:', createdSessionId)
            console.log('signIn?.status:', signIn?.status)
            console.log('signUp?.status:', signUp?.status)

            // Case 1: OAuth created a session directly (new account)
            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId })
                router.replace('/')
                return
            }

            // Case 2: Existing account - signUp returns 'transferable' status
            if ((signUp?.status as string) === 'transferable' && signIn) {
                console.log('Transferring OAuth to existing signIn...')
                const response = await signIn.create({ transfer: true })
                if (response.createdSessionId && setActive) {
                    await setActive({ session: response.createdSessionId })
                    router.replace('/')
                    return
                }
            }

            // Case 3: signIn returns 'transferable' status
            if ((signIn?.status as string) === 'transferable' && signUp) {
                console.log('Transferring OAuth to signUp...')
                const response = await signUp.create({ transfer: true })
                if (response.createdSessionId && setActive) {
                    await setActive({ session: response.createdSessionId })
                    router.replace('/')
                    return
                }
            }

            setError('Sign up was not completed. Please try again.')
        } catch (err: any) {
            console.error('OAuth error:', err)
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
        <View className="flex-1 bg-black">
            <StatusBar style="light" />

            {/* Animated Aurora Background */}
            <View className="absolute inset-0 z-0">
                <AuroraBackground
                    // @ts-ignore
                    colorStops={['#000000', '#1A1A1A', '#FF4500']}
                    blend={0.5}
                    amplitude={1.2}
                    speed={0.5}
                />
            </View>

            {/* Content Container - Centered */}
            <View className="flex-1 justify-center items-center px-5 z-10">

                {/* Glassmorphism Card */}
                <View className="w-full max-w-[400px] bg-neutral-900/90 rounded-3xl py-10 px-6 items-center border border-accent/30 shadow-2xl">

                    {/* Logo Section */}
                    <View className="mb-6">
                        <View className="w-20 h-20 rounded-full bg-black justify-center items-center border-2 border-accent shadow-lg shadow-accent/50">
                            <Image source={icons.logo} className="w-12 h-12" resizeMode="contain" />
                        </View>
                    </View>

                    {/* Text Section */}
                    <View className="items-center mb-8">
                        <Text className="text-3xl font-extrabold text-white mb-2 text-center tracking-wide">
                            Join CineVerse
                        </Text>
                        <Text className="text-base text-gray-400 text-center font-medium">
                            Create your account & explore
                        </Text>
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <View className="w-full bg-accent/10 border border-accent/30 rounded-xl p-3 mb-5">
                            <Text className="text-accent text-sm text-center font-semibold">{error}</Text>
                        </View>
                    ) : null}

                    {/* Google Button */}
                    <View className="w-full mb-6">
                        <Pressable
                            className={`w-full h-14 bg-white rounded-xl flex-row items-center justify-center shadow-md ${loading ? 'opacity-70' : ''} active:opacity-90 active:scale-95`}
                            onPress={onGooglePress}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#000000" />
                            ) : (
                                <View className="flex-row items-center gap-3">
                                    <Text className="text-2xl font-black text-[#4285F4]">G</Text>
                                    <Text className="text-base font-bold text-black">Continue with Google</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>

                    {/* Footer Links */}
                    <View className="flex-row items-center">
                        <Text className="text-gray-400 text-sm">Already have an account? </Text>
                        <Link href="/sign-in" asChild>
                            <Pressable>
                                <Text className="text-accent text-sm font-bold">Sign In</Text>
                            </Pressable>
                        </Link>
                    </View>
                </View>

                {/* Terms text outside card */}
                <Text className="mt-6 text-gray-600 text-xs text-center px-4">
                    By continuing, you agree to our Terms & Privacy Policy
                </Text>
            </View>
        </View>
    )
}