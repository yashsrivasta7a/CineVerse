import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'

export const SignOutButton = () => {
    const { signOut } = useClerk()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleSignOut = async () => {
        try {
            setLoading(true)
            await signOut()
            router.replace('/sign-in')
        } catch (err) {
            console.error(JSON.stringify(err, null, 2))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSignOut}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#FF4500" />
            ) : (
                <Text style={styles.buttonText}>Sign Out</Text>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: 'rgba(255, 69, 0, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 0, 0.3)',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    buttonPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    buttonText: {
        color: '#FF4500',
        fontWeight: '700',
        fontSize: 15,
    },
})