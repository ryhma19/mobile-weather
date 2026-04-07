import React, { useState } from "react"
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const bottomOffset = insets.bottom + 8
  const isMapScreen = state.routes[state.index]?.name === "Map"
  const iconColor = isMapScreen ? "#000" : colors.textSecondary
  const activeIconColor = isMapScreen ? "#000" : colors.textPrimary

  const tabItems = state.routes.map((route, index) => {
    const { options } = descriptors[route.key]
    const isFocused = state.index === index
    const label =
      typeof options.tabBarLabel === "string"
        ? options.tabBarLabel
        : typeof options.title === "string"
          ? options.title
          : route.name

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never)
      }

      setIsOpen(false)
    }

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      })
    }

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.tabBarItem}
      >
        {options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? activeIconColor : iconColor,
          size: 22,
        })}
        <Text
          style={[
            styles.tabBarLabel,
            isFocused ? styles.tabBarLabelActive : null,
            isMapScreen ? styles.tabBarLabelMap : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    )
  })

  if (!isMapScreen) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.tabBarWrapper, { bottom: bottomOffset }]}
      >
        <View style={styles.tabBar}>
          <BlurView
            intensity={10}
            experimentalBlurMethod="dimezisBlurView"
            style={styles.tabBarBackground}
          >
            <View style={styles.tabBarContent}>{tabItems}</View>
          </BlurView>
        </View>
      </View>
    )
  }

  if (!isOpen) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.tabBarToggleContainer, { bottom: bottomOffset }]}
      >
        <Pressable style={styles.tabBarToggle} onPress={() => setIsOpen(true)}>
          <Ionicons name="menu" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
    )
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.tabBarWrapper, { bottom: bottomOffset }]}
    >
      <Pressable
        style={[styles.collapseButton, { bottom: insets.bottom + 84 }]}
        onPress={() => setIsOpen(false)}
      >
        <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.tabBar}>
        <BlurView
          intensity={10}
          experimentalBlurMethod="dimezisBlurView"
          style={styles.tabBarBackground}
        >
          <View style={styles.tabBarContent}>{tabItems}</View>
        </BlurView>
      </View>
    </View>
  )
}

export default function BottomNav() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => (
            <Entypo name="map" size={size} color={color} />
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
              size={size}
              color={color}
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
            <Ionicons name="cloud-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  tabBar: {
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
  tabBarContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabBarItem: {
    flex: 1,
    borderRadius: 18,
    marginHorizontal: 4,
    marginVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabBarLabelActive: {
    color: colors.textPrimary,
  },
  tabBarLabelMap: {
    color: "#000",
  },
  tabBarToggleContainer: {
    position: "absolute",
    right: 20,
  },
  tabBarToggle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 22, 48, 0.72)",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  collapseButton: {
    position: "absolute",
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    backgroundColor: "rgba(10, 22, 48, 0.72)",
    borderWidth: 1,
    borderColor: colors.outline,
  },
})
