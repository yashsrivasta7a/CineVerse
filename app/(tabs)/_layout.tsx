import { images } from "@/constants/images";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, ImageBackground, Text, View } from "react-native";
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useAuth } from '@clerk/clerk-expo';

const TabsIcon = ({ focused, icon, title }: { focused: boolean, icon: any, title: string }) => {
    if (focused) {
        return (
            <View className="flex flex-row w-full flex-1 min-w-[120px] min-h-16 mt-7 items-center justify-center rounded-full overflow-hidden bg-accent" >
                <Ionicons name={icon} color="#151312" size={20} />
                <Text className="text-secondary text-base font-semibold ml-2">{title}</Text>
            </View>
        )
    }
    else {
        return (
            <View className="size-full justify-center items-center mt-7 rounded-full">

                <Ionicons name={`${icon}-outline` as any} color="#fff" size={20} />
            </View>
        )
    }
}

export default function Layout() {
    const { isSignedIn, isLoaded } = useAuth()

    if (!isLoaded) {
        return (
            <View className="flex-1 justify-center items-center bg-black">
                <ActivityIndicator size={"large"} color="#fff" />
            </View>
        )
    }

    if (!isSignedIn) {
        return <Redirect href="/sign-in" />
    }

    return (
        <Tabs screenOptions={{
            tabBarShowLabel: false, tabBarItemStyle: {
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center'
            }
            , tabBarStyle: {
                backgroundColor: "rgba(18, 18, 18, 0.75)",
                height: 62,
                paddingHorizontal: 20,
                marginBottom: 36,
                marginHorizontal: 20,
                borderRadius: 50,
                position: "absolute",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                shadowColor: "#882400ff",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 10,
            }
        }}>
            <Tabs.Screen name="index" options={{
                title: "Home", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="home" title="Home" />
            }} />
            <Tabs.Screen name="search" options={{ title: "Search", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="search" title="Search" /> }} />
            <Tabs.Screen name="upcoming" options={{ title: "Upcoming", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="film" title="Upcoming" /> }} />
            <Tabs.Screen name="bookmark" options={{ title: "Bookmark", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="bookmark" title="Bookmark" /> }} />
            <Tabs.Screen name="profile" options={{ href: null, headerShown: false }} />
        </Tabs>
    )
}



