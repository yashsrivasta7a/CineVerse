import { images } from "@/constants/images";
import { Tabs } from "expo-router";
import { ImageBackground, Text, View } from "react-native";
import { Ionicons } from '@react-native-vector-icons/ionicons';

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

                <Ionicons name={`${icon}-outline`} color="#fff" size={20} />
            </View>
        )
    }
}

export default function Layout() {
    return (
        <Tabs screenOptions={{
            tabBarShowLabel: false, tabBarItemStyle: {
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center'
            }
            , tabBarStyle: {
                backgroundColor: "#121212",
                height: 62,
                paddingHorizontal: 20,
                marginBottom: 36,
                marginHorizontal: 20,
                borderRadius: 50,
                position: "absolute",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#121212"
            }
        }}>
            <Tabs.Screen name="index" options={{
                title: "Home", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="home" title="Home" />
            }} />
            <Tabs.Screen name="search" options={{ title: "Search", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="search" title="Search" /> }} />
            <Tabs.Screen name="bookmark" options={{ title: "Bookmark", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="bookmark" title="Bookmark" /> }} />
            <Tabs.Screen name="profile" options={{ title: "Profile", headerShown: false, tabBarIcon: ({ focused }) => <TabsIcon focused={focused} icon="person" title="Profile" /> }} />
        </Tabs>
    )
}



