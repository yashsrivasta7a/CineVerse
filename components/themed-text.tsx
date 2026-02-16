import React from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'

type ThemedTextProps = TextProps & {
    type?: 'default' | 'title' | 'link'
}

export const ThemedText = ({ type = 'default', style, ...props }: ThemedTextProps) => {
    return (
        <Text
            style={[
                styles.default,
                type === 'title' && styles.title,
                type === 'link' && styles.link,
                style,
            ]}
            {...props}
        />
    )
}

const styles = StyleSheet.create({
    default: {
        color: '#E0E0E0',
        fontSize: 14,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    link: {
        color: '#FF4500',
        fontWeight: '600',
    },
})
