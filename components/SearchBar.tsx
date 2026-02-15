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
        <View className='flex-row items-center gap-2 bg-dark-200 border border-[#1e1e1e] rounded-full px-4 py-2'>
            <Image source={icons.search} className="w-5 h-5" tintColor="#FF4500" />

            {onPress ? (
                <Pressable onPress={onPress} className="flex-1">
                    <TextInput
                        placeholder={placeholder}
                        placeholderTextColor={'#7d7d98'}
                        editable={false}
                        pointerEvents="none"
                        className='text-lg flex-1 ml-2 text-white font-medium'
                    />
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