import { View, Text, Switch, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function Notifications() {
    const router = useRouter()
    const [pushEnabled, setPushEnabled] = useState(true)
    const [emailEnabled, setEmailEnabled] = useState(true)
    const [marketingEnabled, setMarketingEnabled] = useState(false)

    return (
        <View className="flex-1 bg-primary px-6 pt-6">
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Notifications',
                headerTintColor: '#fff',
                headerStyle: { backgroundColor: '#000' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                )
            }} />

            <View className="bg-dark-100 rounded-2xl p-4 border border-dark-200 mt-4">
                {/* Push Notifications */}
                <View className="flex-row items-center justify-between py-3">
                    <View className="flex-1 pr-4">
                        <Text className="text-light-100 font-semibold text-lg">Push Notifications</Text>
                        <Text className="text-light-300 text-sm mt-1">Receive alerts about new movies and trends</Text>
                    </View>
                    <Switch
                        trackColor={{ false: '#2A2A2A', true: '#FF4500' }}
                        thumbColor={pushEnabled ? '#fff' : '#f4f3f4'}
                        onValueChange={setPushEnabled}
                        value={pushEnabled}
                    />
                </View>

                <View className="h-[1px] bg-dark-200 my-2" />

                {/* Email Notifications */}
                <View className="flex-row items-center justify-between py-3">
                    <View className="flex-1 pr-4">
                        <Text className="text-light-100 font-semibold text-lg">Email Updates</Text>
                        <Text className="text-light-300 text-sm mt-1">Get weekly newsletters and digests</Text>
                    </View>
                    <Switch
                        trackColor={{ false: '#2A2A2A', true: '#FF4500' }}
                        thumbColor={emailEnabled ? '#fff' : '#f4f3f4'}
                        onValueChange={setEmailEnabled}
                        value={emailEnabled}
                    />
                </View>

                <View className="h-[1px] bg-dark-200 my-2" />

                {/* Marketing Notifications */}
                <View className="flex-row items-center justify-between py-3">
                    <View className="flex-1 pr-4">
                        <Text className="text-light-100 font-semibold text-lg">Marketing</Text>
                        <Text className="text-light-300 text-sm mt-1">Receive offers and promotions</Text>
                    </View>
                    <Switch
                        trackColor={{ false: '#2A2A2A', true: '#FF4500' }}
                        thumbColor={marketingEnabled ? '#fff' : '#f4f3f4'}
                        onValueChange={setMarketingEnabled}
                        value={marketingEnabled}
                    />
                </View>
            </View>
        </View>
    )
}
