import React, { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"
import { colors } from "../theme/colors"
import { RootTabParamList } from "../types/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Location from "expo-location"
import { fetchWeatherByCoordinates } from "../services/weather"
import { WeatherData } from "../types/weather"

type SectionCardProps = {
  title: string
  description: string
  onPress?: () => void
}

type OverviewScreenNavigationProp = BottomTabNavigationProp<RootTabParamList>

function SectionCard({ title, description, onPress }: SectionCardProps) {
  return (
    <Pressable style={styles.sectionCard} onPress={onPress}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionCardTitle}>{title}</Text>
        <Text style={styles.sectionCardArrow}>→</Text>
      </View>
      <Text style={styles.sectionCardDescription}>{description}</Text>
    </Pressable>
  )
}

export default function OverviewScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<OverviewScreenNavigationProp>()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadWeather() {
      try {
        setLoading(true)
        setError(false)

        // Asks the user for the GPS permission.
        const permission = await Location.requestForegroundPermissionsAsync()

        if (permission.status !== "granted") {
          setError(true)
          return
        }

        // Fetches the location, first from the cache, then from the GPS.
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

        // Turns coordinates into a city name.
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

        // Fetches the weather data by sending coordinates to Open-Meteo API that returns the data.
        const weatherData = await fetchWeatherByCoordinates(
          latitude,
          longitude,
          city,
          country
        )

        setWeather(weatherData)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadWeather()
  }, [])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.weatherCard}>
        <View style={styles.locationRow}>
          <Text style={styles.location}>
            {weather ? weather.city : "Current location"}
          </Text>
          <Text style={styles.locationSub}>
            {weather ? weather.country : ""}
          </Text>
        </View>

        <View style={styles.weatherTopRow}>
          <View>
            <Text style={styles.weatherLabel}>
              {loading
                ? "Loading weather..."
                : error
                  ? "Weather unavailable"
                  : weather?.weatherLabel}
            </Text>
            <Text style={styles.feelsLike}>
              {loading
                ? "Please wait"
                : error
                  ? "Location or weather failed"
                  : `Feels like ${weather?.feelsLike}°`}
            </Text>
          </View>
          <Text style={styles.temperature}>
            {loading ? "--°" : error ? "--°" : `${weather?.temperature}°`}
          </Text>
        </View>

        <View style={styles.hourlyRow}>
          {loading || error || !weather
            ? ["--", "--", "--", "--", "--", "--"].map((hour, index) => (
                <View key={index} style={styles.hourItem}>
                  <Text style={styles.hourText}>{hour}</Text>
                  <Text style={styles.hourTemp}>--°</Text>
                </View>
              ))
            : weather.hourly.map((item, index) => (
                <View key={`${item.time}-${index}`} style={styles.hourItem}>
                  <Text style={styles.hourText}>{item.time}</Text>
                  <Text style={styles.hourTemp}>{item.temperature}°</Text>
                </View>
              ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explore</Text>

        <SectionCard
          title="Map overview"
          description="Opens the main outdoor map with detailed views of the terrain?"
          onPress={() => navigation.navigate("Map")}
        />
        <SectionCard
          title="List of species"
          description="Browse all recorded plant, berry, animals"
          onPress={() => navigation.navigate("Species")}
        />
        <SectionCard
          title="Nature observations"
          description="For browsing the plant, berries and fish data? User added information? Plant detection using camera?"
        />
        <SectionCard
          title="Weather details"
          description="See the full forecast, hourly conditions and weather in more detail?"
          onPress={() => navigation.navigate("Weather")}
        />
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

  weatherCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 24,
    minHeight: 250,
    justifyContent: "space-between",
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
  temperature: {
    fontSize: 64,
    lineHeight: 68,
    fontWeight: "300",
    color: colors.textPrimary,
  },
  feelsLike: {
    fontSize: 15,
    color: colors.textSecondary,
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

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 14,
  },

  sectionCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 12,
    minHeight: 118,
    justifyContent: "center",
  },
  sectionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionCardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionCardArrow: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  sectionCardDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 24,
  },
})