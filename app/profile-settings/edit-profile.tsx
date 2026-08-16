import React, { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'

import { Screen } from '@/components/ui/Screen'
import { Text } from '@/components/ui/Text'
import { Display } from '@/components/ui/Display'
import { Button } from '@/components/ui/Button'
import { colors, grid, radius, withAlpha } from '@/theme/tokens'
import { typography } from '@/theme/typography'

const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
}: {
    label: string
    value: string
    onChangeText: (text: string) => void
    placeholder: string
}) => (
    <View style={{ gap: 7 }}>
        <Text variant="label" color={withAlpha(colors.paper, 0.6)}>{label}</Text>
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={withAlpha(colors.ink, 0.45)}
            accessibilityLabel={label}
            style={[
                typography.body,
                {
                    backgroundColor: colors.paper,
                    color: colors.ink,
                    borderRadius: radius.sm,
                    borderWidth: 2,
                    borderColor: colors.noir,
                    paddingHorizontal: 13,
                    paddingVertical: 12,
                },
            ]}
        />
    </View>
)

export default function EditProfile() {
    const { user } = useUser()
    const router = useRouter()
    const [firstName, setFirstName] = useState(user?.firstName || '')
    const [lastName, setLastName] = useState(user?.lastName || '')
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        if (!user) return
        setLoading(true)
        try {
            await user.update({ firstName, lastName })
            Alert.alert('Saved', 'Your profile has been updated.')
            router.back()
        } catch (error: any) {
            // Clerk returns errors under `errors[]`; the previous code read
            // `error.pageMessage`, which never exists, so every failure showed
            // the generic fallback.
            const message =
                error?.errors?.[0]?.longMessage ||
                error?.errors?.[0]?.message ||
                'Could not update your profile.'
            Alert.alert('Something went wrong', message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Screen osd={{ left: 'MEMBER', right: 'EDIT&SAVE' }}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6, gap: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Pressable
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.inkRaised,
                            borderWidth: 2,
                            borderColor: colors.noir,
                        }}
                    >
                        <Ionicons name="arrow-back" size={18} color={colors.paper} />
                    </Pressable>
                    <Display variant="displaySm">Edit profile</Display>
                </View>

                <View style={{ gap: 16 }}>
                    <Field
                        label="First name"
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Enter first name"
                    />
                    <Field
                        label="Last name"
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Enter last name"
                    />
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.blood} />
                ) : (
                    <Button label="Save changes" onPress={handleSave} />
                )}
            </View>
        </Screen>
    )
}
