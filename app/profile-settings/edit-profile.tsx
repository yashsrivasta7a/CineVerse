import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'

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
            await user.update({
                firstName,
                lastName,
            })
            Alert.alert('Success', 'Profile updated successfully')
            router.back()
        } catch (error: any) {
            console.error(error)
            Alert.alert('Error', error.pageMessage || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    return (
        <View className="flex-1 bg-primary px-6 pt-6">
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Edit Profile',
                headerTintColor: '#fff',
                headerStyle: { backgroundColor: '#000' },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                )
            }} />

            <View className="space-y-6 mt-4">
                <View>
                    <Text className="text-light-300 mb-2 font-medium">First Name</Text>
                    <TextInput
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Enter first name"
                        placeholderTextColor="#666"
                        className="bg-dark-100 text-light-100 p-4 rounded-xl border border-dark-200 focus:border-accent"
                    />
                </View>

                <View>
                    <Text className="text-light-300 mb-2 mt-4 font-medium">Last Name</Text>
                    <TextInput
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Enter last name"
                        placeholderTextColor="#666"
                        className="bg-dark-100 text-light-100 p-4 rounded-xl border border-dark-200 focus:border-accent"
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    className={`bg-accent p-4 rounded-xl items-center mt-8 ${loading ? 'opacity-70' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    )
}
