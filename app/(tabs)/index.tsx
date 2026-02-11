import AuroraBackground from "../../components/AuroraBackground"
import { Image, ScrollView, Text, View } from "react-native";
import { icons } from "@/constants/icons";
import SearchBar from "../../components/SearchBar";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-primary">
      <View className="absolute inset-0">
        <AuroraBackground
          colorStops={[
            "#2E1065",
            "#4C1D95",
            "#6D28D9",
            "#A78BFA"
          ]}
          blend={5}
          amplitude={1.0}
          speed={1}
        />
      </View>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ minHeight: "100%", paddingBottom: 10 }}>
        <Image source={icons.logo} className="w-12 h-10 mt-20 mb-5 mx-auto" />
        <View className="flex-1 mt-5">
          <SearchBar onPress={() => router.push('/search')} placeholder="Search for the movie" />
        </View>
      </ScrollView>

    </View>
  );
}
