import { View, Text, Image, ScrollView, Platform, TouchableOpacity } from 'react-native'
import React from 'react'
import { useUser } from '@clerk/clerk-expo'
import { SignOutButton } from '@/components/sign-out-button'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
  const { user } = useUser()
  const router = useRouter()

  const getInitial = () => {
    if (user?.firstName) return user.firstName[0].toUpperCase()
    if (user?.emailAddresses?.[0]) return user.emailAddresses[0].emailAddress[0].toUpperCase()
    return '?'
  }

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', route: '/profile-settings/edit-profile' },
    { icon: 'notifications-outline', label: 'Notifications', route: '/profile-settings/notifications' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', route: '/profile-settings/privacy' },
    { icon: 'help-circle-outline', label: 'Help & Support', route: '/profile-settings/help' },
  ]

  return (
    <View className="flex-1 bg-primary">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1 px-6 pt-16"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-extrabold text-light-100 mb-8">Profile</Text>


        <View className="items-center mb-8">
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              className="w-24 h-24 rounded-full border-4 border-accent mb-4"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-dark-100 border-4 border-accent items-center justify-center mb-4">
              <Text className="text-accent text-4xl font-bold">{getInitial()}</Text>
            </View>
          )}

          <Text className="text-light-100 text-2xl font-bold mb-1">
            {user?.fullName || user?.firstName || 'User'}
          </Text>
          <Text className="text-light-300 text-sm">
            {user?.primaryEmailAddress?.emailAddress || ''}
          </Text>
        </View>


        <View className="bg-dark-100 rounded-2xl p-5 mb-6 border border-dark-200 shadow-sm">
          <View className="flex-row justify-between items-center py-1">
            <Text className="text-light-300 font-medium">Member Since</Text>
            <Text className="text-light-200 font-semibold">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              }) : '—'}
            </Text>
          </View>
          <View className="h-[1px] bg-dark-200 my-3" />
          <View className="flex-row justify-between items-center py-1">
            <Text className="text-light-300 font-medium">Email</Text>
            <Text className="text-light-200 font-semibold max-w-[60%]" numberOfLines={1}>
              {user?.primaryEmailAddress?.emailAddress || '—'}
            </Text>
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-light-300 font-semibold mb-3 ml-1">General</Text>
          <View className="bg-dark-100 rounded-2xl overflow-hidden border border-dark-200">
            {menuItems.map((item, index) => (
              <View key={index}>
                <TouchableOpacity
                  onPress={() => router.push(item.route as any)}
                  className="flex-row items-center justify-between p-4 active:bg-dark-200/50"
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-8 h-8 rounded-full bg-dark-200 items-center justify-center">
                      <Ionicons name={item.icon as any} size={18} color="#E0E0E0" />
                    </View>
                    <Text className="text-light-100 font-medium text-base">{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#555" />
                </TouchableOpacity>
                {index < menuItems.length - 1 && <View className="h-[1px] bg-dark-200 ml-16" />}
              </View>
            ))}
          </View>
        </View>

        <View className="mt-2">
          <SignOutButton />
        </View>
      </ScrollView>
    </View>
  )
}
