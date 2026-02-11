import { Image, View, Text, TextInput } from 'react-native'
import React from 'react'
import { icons } from '@/constants/icons'

const SearchBar = ({ onPress, placeholder }: { onPress: () => void, placeholder: string }) => {
    return (
        <View className='flex-row items-center gap-1 bg-dark-200 border border-[#1e1e1e] rounded-full px-4 py-2'>
            <Image source={icons.search} className="w-5 h-5" />
            <TextInput onPress={onPress} value={''} onChangeText={(text) => console.log(text)} placeholderTextColor={'#7d7d98ff'} placeholder={placeholder} className=' text-xl ' />
        </View>
    )
}

export default SearchBar