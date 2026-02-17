import { Image, View, TextInput, Pressable, Text } from 'react-native'
import React, { forwardRef } from 'react'
import { icons } from '@/constants/icons'

interface SearchBarProps {
    onPress?: () => void;
    placeholder: string;
    value?: string;
    onChangeText?: (text: string) => void;
    autoFocus?: boolean;
}

const SearchBar = forwardRef<TextInput, SearchBarProps>(
    ({ onPress, placeholder, value, onChangeText, autoFocus = false }, ref) => {
        return (
            <View
                className='flex-row items-center gap-2 rounded-full px-5 py-3'
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    shadowColor: '#6d1f03ff',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                }}
            >
                <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(255, 69, 0, 0.15)' }}
                >
                    <Image source={icons.search} className="w-4 h-4" tintColor="#FF4500" />
                </View>

                {onPress ? (
                    <Pressable onPress={onPress} className="flex-1">
                        <TextInput
                            placeholder={placeholder}
                            placeholderTextColor={'rgba(255, 255, 255, 0.35)'}
                            editable={false}
                            pointerEvents="none"
                            className='text-base flex-1 ml-1 text-white font-medium'
                        />
                    </Pressable>
                ) : (
                    <TextInput
                        ref={ref}
                        value={value}
                        onChangeText={onChangeText}
                        placeholderTextColor={'rgba(255, 255, 255, 0.35)'}
                        placeholder={placeholder}
                        className='text-base flex-1 ml-1 text-white font-medium'
                        autoFocus={autoFocus}
                    />
                )}
            </View>
        )
    }
)

export default SearchBar