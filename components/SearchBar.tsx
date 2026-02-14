import { Image, View, TextInput, Pressable, Text } from 'react-native'
import React from 'react'
import { icons } from '@/constants/icons'

interface SearchBarProps {
    onPress?: () => void;
    placeholder: string;
    value?: string;
    onChangeText?: (text: string) => void;
    autoFocus?: boolean;
}

const SearchBar = ({ onPress, placeholder, value, onChangeText, autoFocus = false }: SearchBarProps) => {
    return (
        <View className='flex-row items-center gap-2 bg-dark-200 border border-[#1e1e1e] rounded-full px-4 py-3'>
            <Image source={icons.search} className="w-5 h-5" tintColor="#AB8BFF" />

            {onPress ? (
                <Pressable onPress={onPress} className="flex-1 justify-center">
                    <Text className="text-lg text-[#7d7d98] ml-2 font-medium">
                        {value || placeholder}
                    </Text>
                </Pressable>
            ) : (
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholderTextColor={'#7d7d98'}
                    placeholder={placeholder}
                    className='text-lg flex-1 ml-2 text-white font-medium'
                    autoFocus={autoFocus}
                />
            )}
        </View>
    )
}

export default SearchBar