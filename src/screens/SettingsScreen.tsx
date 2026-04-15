import React, { useState } from "react"
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { colors } from "../theme/colors"
import { useWeatherSettings } from "../context/WeatherSettingsContext"

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const [weatherOpen, setWeatherOpen] = useState(false)
  const {
    temperatureUnit,
    setTemperatureUnit,
    windUnit,
    setWindUnit,
  } = useWeatherSettings()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: 60,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Settings</Text>

      <Pressable
        style={styles.card}
        onPress={() => setWeatherOpen(!weatherOpen)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Weather</Text>
          <Text style={styles.cardArrow}>{weatherOpen ? "−" : "+"}</Text>
        </View>

        <Text style={styles.cardText}>
          Weather settings
        </Text>

        {weatherOpen && (
          <View style={styles.dropdownContent}>
            <View style={styles.settingBlock}>
              <Text style={styles.settingTitle}>Temperature unit</Text>

              <View style={styles.optionRow}>
                <Pressable
                  style={[
                    styles.optionButton,
                    temperatureUnit === "Celsius" ? styles.optionButtonActive : null,
                  ]}
                  onPress={() => setTemperatureUnit("Celsius")}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      temperatureUnit === "Celsius" ? styles.optionButtonTextActive : null,
                    ]}
                  >
                    Celsius
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.optionButton,
                    temperatureUnit === "Fahrenheit" ? styles.optionButtonActive : null,
                  ]}
                  onPress={() => setTemperatureUnit("Fahrenheit")}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      temperatureUnit === "Fahrenheit" ? styles.optionButtonTextActive : null,
                    ]}
                  >
                    Fahrenheit
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingBlock}>
              <Text style={styles.settingTitle}>Wind speed unit</Text>

              <View style={styles.optionRow}>
                <Pressable
                  style={[
                    styles.optionButton,
                    windUnit === "m/s" ? styles.optionButtonActive : null,
                  ]}
                  onPress={() => setWindUnit("m/s")}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      windUnit === "m/s" ? styles.optionButtonTextActive : null,
                    ]}
                  >
                    m/s
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.optionButton,
                    windUnit === "km/h" ? styles.optionButtonActive : null,
                  ]}
                  onPress={() => setWindUnit("km/h")}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      windUnit === "km/h" ? styles.optionButtonTextActive : null,
                    ]}
                  >
                    km/h
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Map</Text>
        <Text style={styles.cardText}>
          Map settings and layer options here?
        </Text>
      </View>

      <Pressable
  style={styles.card}
  onPress={() => navigation.navigate("Profile")}
>
  <Text style={styles.cardTitle}>Profile</Text>
  <Text style={styles.cardText}>
    Profile settings
  </Text>
</Pressable>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 16,
  },

  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 12,
    justifyContent: "center",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  cardArrow: {
    color: colors.textSecondary,
    fontSize: 22,
    fontWeight: "700",
  },

  cardText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  dropdownContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },

  settingBlock: {
    marginBottom: 16,
  },

  settingTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },

  optionRow: {
    flexDirection: "row",
    gap: 10,
  },

  optionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  optionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  optionButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  optionButtonTextActive: {
    color: colors.background,
  },

  bottomSpacer: {
    height: 24,
  },
})