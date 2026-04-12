import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Location from "expo-location"
import { colors } from "../theme/colors"
import { fetchWeatherByCity, fetchWeatherByCoordinates } from "../services/weather"
import { WeatherData } from "../types/weather"
import { setupNotifications, sendTestWeatherNotification } from "../services/notifications"
import { useWeatherSettings } from "../context/WeatherSettingsContext"

function formatTemperature(value: number, unit: "Celsius" | "Fahrenheit") {
  if (unit === "Fahrenheit") {
    return `${Math.round((value * 9) / 5 + 32)}°`
  }

  return `${Math.round(value)}°`
}

function formatWindSpeed(value: number, unit: "m/s" | "km/h") {
  if (unit === "m/s") {
    return `${(value / 3.6).toFixed(1)} m/s`
  }

  return `${Math.round(value)} km/h`
}

export default function WeatherScreen() {
  const insets = useSafeAreaInsets()
  const { temperatureUnit, windUnit } = useWeatherSettings()

  const [searchText, setSearchText] = useState("")
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Search city via the search bar manually.
  async function loadWeather(city: string) {
    try {
      setLoading(true)
      setError("")

      const data = await fetchWeatherByCity(city)
      setWeather(data)
      setSearchText(data.city)
    } catch (err) {
      setError("City not found or weather fetch failed")
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  //By default searches the city via GPS information.
  async function loadWeatherFromLocation() {
    try {
      setLoading(true)
      setError("")

      const permission = await Location.requestForegroundPermissionsAsync()

      if (permission.status !== "granted") {
        setError("Location permission denied")
        setWeather(null)
        return
      }

      let currentLocation = await Location.getLastKnownPositionAsync({})

      if (!currentLocation) {
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
      }

      const latitude = currentLocation.coords.latitude
      const longitude = currentLocation.coords.longitude

      let city = "Current location"
      let country = ""

      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        })

        const place = reverseGeocode[0]

        city =
          place?.city ||
          place?.subregion ||
          place?.region ||
          "Current location"

        country = place?.country || ""
      } catch (reverseGeocodeError) {}

      const data = await fetchWeatherByCoordinates(
        latitude,
        longitude,
        city,
        country
      )

      setWeather(data)
      setSearchText(city)
    } catch (err) {
      setError("Location or weather failed")
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleWeatherNotification() {
    if (!weather) {
      return
    }

    const granted = await setupNotifications()

    if (!granted) {
      return
    }

    const message =
      `${weather.city}: ${weather.weatherLabel}, ` +
      `${formatTemperature(weather.temperature, temperatureUnit)}, precipitation ${weather.precipitation} mm, ` +
      `wind ${formatWindSpeed(weather.windSpeed, windUnit)}`

    await sendTestWeatherNotification(message)
  }

  useEffect(() => {
    loadWeatherFromLocation()
  }, [])

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
      <Text style={styles.screenTitle}>Weather</Text>

      <View style={styles.searchCard}>
        <Text style={styles.label}>Search by city</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Type city name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="words"
          />

          <Pressable
            style={styles.searchButton}
            onPress={() => loadWeather(searchText)}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.weatherCard}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color={colors.textPrimary} />
            <Text style={styles.loadingText}>Loading weather...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : weather ? (
          <>
            <View style={styles.locationRow}>
              <Text style={styles.location}>{weather.city}</Text>
              <Text style={styles.locationSub}>{weather.country}</Text>
            </View>

            <View style={styles.weatherTopRow}>
              <View>
                <Text style={styles.weatherLabel}>{weather.weatherLabel}</Text>
                <Text style={styles.feelsLike}>
                  Feels like {formatTemperature(weather.feelsLike, temperatureUnit)}
                </Text>
              </View>
              <Text style={styles.temperature}>
                {formatTemperature(weather.temperature, temperatureUnit)}
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Wind</Text>
                <Text style={styles.detailValue}>
                  {formatWindSpeed(weather.windSpeed, windUnit)}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Precipitation</Text>
                <Text style={styles.detailValue}>
                  {weather.precipitation} mm
                </Text>
              </View>
            </View>

            <View style={styles.hourlySection}>
              <Text style={styles.hourlyTitle}>Next hours</Text>

              <View style={styles.hourlyRow}>
                {weather.hourly.map((item, index) => (
                  <View key={`${item.time}-${index}`} style={styles.hourItem}>
                    <Text style={styles.hourText}>{item.time}</Text>
                    <Text style={styles.hourTemp}>
                      {formatTemperature(item.temperature, temperatureUnit)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              style={styles.notificationButton}
              onPress={handleWeatherNotification}
            >
              <Text style={styles.notificationButtonText}>
                Send weather notification
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

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

  searchCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    color: "#17396D",
    fontWeight: "700",
    fontSize: 15,
  },

  weatherCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 320,
  },

  centerContent: {
    minHeight: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: "center",
  },

  locationRow: {
    marginBottom: 20,
  },
  location: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  locationSub: {
    marginTop: 4,
    fontSize: 16,
    color: colors.textSecondary,
  },

  weatherTopRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  weatherLabel: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  feelsLike: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  temperature: {
    fontSize: 64,
    lineHeight: 68,
    fontWeight: "300",
    color: colors.textPrimary,
  },

  detailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  detailTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },

  hourlySection: {
    marginTop: 4,
  },
  hourlyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  hourlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  hourItem: {
    alignItems: "center",
    flex: 1,
  },
  hourText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  hourTemp: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  notificationButton: {
    marginTop: 20,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationButtonText: {
    color: "#17396D",
    fontWeight: "700",
    fontSize: 15,
  },

  bottomSpacer: {
    height: 24,
  },
})