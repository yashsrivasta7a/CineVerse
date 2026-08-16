import React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Image } from 'expo-image'
import { useUser } from '@clerk/clerk-expo'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { Screen } from '@/components/ui/Screen'
import { Text } from '@/components/ui/Text'
import { Display } from '@/components/ui/Display'
import { TicketCard } from '@/components/kino/TicketCard'
import { Barcode } from '@/components/kino/Barcode'
import { SignOutButton } from '@/components/sign-out-button'
import { usePrefs, selectByFacet } from '@/lib/store/prefs'
import { colors, grid, radius, withAlpha } from '@/theme/tokens'

const SettingsRow = ({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: any
  label: string
  detail?: string
  onPress: () => void
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.inkRaised,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.noir,
      padding: 16,
      opacity: pressed ? 0.85 : 1,
    })}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
      <Ionicons name={icon} size={18} color={colors.blood} />
      <Text variant="heading">{label}</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {detail ? (
        <Text variant="osd" color={withAlpha(colors.paper, 0.5)}>{detail}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={withAlpha(colors.paper, 0.4)} />
    </View>
  </Pressable>
)

export default function ProfileScreen() {
  const { user } = useUser()
  const router = useRouter()

  const entries = usePrefs((state) => state.entries)
  const resetAll = usePrefs((state) => state.resetAll)

  const likedGenres = selectByFacet(entries, 'genre', 'like').length
  const likedActors = selectByFacet(entries, 'person', 'like').length

  const redoOnboarding = () => {
    resetAll()
    router.replace('/' as never)
  }

  const getInitial = () => {
    if (user?.firstName) return user.firstName[0].toUpperCase()
    if (user?.emailAddresses?.[0]) return user.emailAddresses[0].emailAddress[0].toUpperCase()
    return '?'
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <Screen osd={{ left: 'MEMBER', right: 'YOUR PASS' }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: grid.screenPadding,
          paddingTop: 6,
          paddingBottom: 130,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Display variant="display">Your pass</Display>
        <Text
          variant="script"
          color={colors.blood}
          style={{ marginTop: -2, marginLeft: 4, transform: [{ rotate: '-3deg' }] }}
        >
          season ticket
        </Text>

        {/* Membership stub */}
        <TicketCard pageBackground={colors.ink} style={{ marginTop: 22 }} notchOffset={132}>
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  borderWidth: 2,
                  borderColor: colors.ink,
                }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  backgroundColor: colors.blood,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.ink,
                }}
              >
                <Text variant="display" color={colors.paper}>{getInitial()}</Text>
              </View>
            )}

            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" color={colors.ink} numberOfLines={1}>
                {user?.fullName || user?.firstName || 'Guest'}
              </Text>
              <Text variant="bodySm" color={withAlpha(colors.ink, 0.65)} numberOfLines={1}>
                {user?.primaryEmailAddress?.emailAddress || ''}
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 26,
              paddingBottom: 18,
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ gap: 2 }}>
              <Text variant="osd" color={withAlpha(colors.ink, 0.5)}>Member since</Text>
              <Text variant="heading" color={colors.ink}>{memberSince}</Text>
            </View>
            <Barcode value={user?.id || 'guest'} height={24} bars={22} />
          </View>
        </TicketCard>

        {/* Settings */}
        <Text variant="label" color={withAlpha(colors.paper, 0.55)} style={{ marginTop: 30, marginBottom: 10 }}>
          General
        </Text>

        <View style={{ gap: 10 }}>
          <SettingsRow
            icon="person-outline"
            label="Edit profile"
            onPress={() => router.push('/profile-settings/edit-profile' as never)}
          />
          <SettingsRow
            icon="options-outline"
            label="Taste preferences"
            detail={`${likedGenres} genres · ${likedActors} actors`}
            onPress={redoOnboarding}
          />
        </View>

        <View style={{ marginTop: 26 }}>
          <SignOutButton />
        </View>
      </ScrollView>
    </Screen>
  )
}
