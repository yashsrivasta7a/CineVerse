import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function HelpSupport() {
    const router = useRouter()

    const faqs = [
        {
            question: "How do I reset my password?",
            answer: "You can reset your password from the login screen by tapping 'Forgot Password'."
        },
        {
            question: "Can I download movies?",
            answer: "Currently, CineVerse is a streaming-only platform. Offline viewing is coming soon!"
        },
        {
            question: "Where can I see my watch history?",
            answer: "Your watch history is available in the 'My Lists' section of your profile."
        }
    ]

    return (
        <View className="flex-1 bg-primary">
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Help & Support',
                headerTintColor: '#fff',
                headerStyle: { backgroundColor: '#000' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
                <Text className="text-light-100 font-bold text-2xl mb-6">Frequently Asked Questions</Text>

                <View className="space-y-4">
                    {faqs.map((faq, index) => (
                        <View key={index} className="bg-dark-100 rounded-2xl p-5 border border-dark-200 mb-4">
                            <Text className="text-light-100 font-bold text-lg mb-2">{faq.question}</Text>
                            <Text className="text-light-300 leading-6">{faq.answer}</Text>
                        </View>
                    ))}
                </View>

                <View className="mt-8 bg-accent/10 rounded-2xl p-6 border border-accent/20 items-center">
                    <Ionicons name="mail-outline" size={40} color="#FF4500" />
                    <Text className="text-light-100 font-bold text-lg mt-4 mb-2">Still need help?</Text>
                    <Text className="text-light-300 text-center mb-6">Our support team is available 24/7 to assist you with any issues.</Text>
                    <TouchableOpacity className="bg-accent px-8 py-3 rounded-full w-full items-center">
                        <Text className="text-white font-bold">Contact Support</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    )
}
