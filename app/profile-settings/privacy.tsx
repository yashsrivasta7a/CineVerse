import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function PrivacyPolicy() {
    const router = useRouter()
    return (
        <View className="flex-1 bg-primary">
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Privacy & Security',
                headerTintColor: '#fff',
                headerStyle: { backgroundColor: '#000' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="bg-dark-100 rounded-2xl p-5 border border-dark-200">
                    <Text className="text-light-100 font-bold text-xl mb-4">Privacy Policy</Text>
                    <Text className="text-light-300 leading-6 mb-4">
                        At CineVerse, we value your privacy. This policy explains how we collect, use, and protect your personal information.
                    </Text>

                    <Text className="text-light-100 font-bold text-lg mb-2">Data Collection</Text>
                    <Text className="text-light-300 leading-6 mb-4">
                        We collect information you provide directly to us, such as when you create an account, update your profile, or contact customer support.
                    </Text>

                    <Text className="text-light-100 font-bold text-lg mb-2">Data Security</Text>
                    <Text className="text-light-300 leading-6 mb-4">
                        We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
                    </Text>

                    <Text className="text-light-100 font-bold text-lg mb-2">Third-Party Services</Text>
                    <Text className="text-light-300 leading-6 mb-4">
                        We may use third-party services like Clerk for authentication. Please review their privacy policies for more information on how they handle your data.
                    </Text>
                </View>

                <TouchableOpacity className="mt-6 flex-row items-center justify-between bg-dark-100 p-4 rounded-xl border border-dark-200">
                    <Text className="text-light-100 font-medium">Change Password</Text>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity className="mt-4 flex-row items-center justify-between bg-dark-100 p-4 rounded-xl border border-dark-200">
                    <Text className="text-red-500 font-medium">Delete Account</Text>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>

            </ScrollView>
        </View>
    )
}
