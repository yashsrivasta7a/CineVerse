import { useClerk } from '@clerk/clerk-expo'
import { useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '@/components/ui/Text'
import { colors, radius } from '@/theme/tokens'

export const SignOutButton = () => {
  const { signOut } = useClerk()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Pressable
      onPress={handleSignOut}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      accessibilityState={{ disabled: loading }}
      style={({ pressed }) => ({
        backgroundColor: colors.blood,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.noir,
        paddingVertical: 14,
        opacity: loading ? 0.6 : 1,
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.paper} />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.paper} />
          <Text variant="label" color={colors.paper}>Sign out</Text>
        </View>
      )}
    </Pressable>
  )
}

export default SignOutButton
