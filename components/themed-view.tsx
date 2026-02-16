import React from 'react'
import { View, ViewProps, StyleSheet } from 'react-native'

export const ThemedView = ({ style, ...props }: ViewProps) => {
    return <View style={[styles.container, style]} {...props} />
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000000',
    },
})
