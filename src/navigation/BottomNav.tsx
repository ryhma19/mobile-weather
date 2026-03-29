import React from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StyleSheet } from "react-native"
import { BlurView } from "expo-blur"
import OverviewScreen from "../screens/OverviewScreen"
import MapScreen from "../screens/MapScreen"
import ListOfSpeciesScreen from "../screens/ListOfSpeciesScreen"
import { RootTabParamList } from "../types/navigation"
import { colors } from "../theme/colors"
import Entypo from "@expo/vector-icons/Entypo"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import Ionicons from "@expo/vector-icons/Ionicons"
import WeatherScreen from "../screens/WeatherScreen"

const Tab = createBottomTabNavigator<RootTabParamList>()

export default function BottomNav() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          <BlurView
            intensity={5}
            experimentalBlurMethod="dimezisBlurView"
            style={styles.tabBarBackground}
          />
        ),
      }}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={24}
              color={colors.textPrimary}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => (
            <Entypo name="map" size={24} color={colors.textPrimary} />
          ),
        }}
      />
      <Tab.Screen
        name="Species"
        component={ListOfSpeciesScreen}
        options={{
          tabBarLabel: "Species",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="flower-outline"
              size={24}
              color={colors.textPrimary}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Weather"
        component={WeatherScreen}
        options={{
          tabBarLabel: "Weather",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="cloud-outline"
              size={24}
              color={colors.textPrimary}
            />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 72,
    borderTopWidth: 0,
    backgroundColor: "transparent",
    elevation: 0,
  },
  tabBarBackground: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabBarItem: {
    borderRadius: 18,
    marginHorizontal: 6,
    marginVertical: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
})
