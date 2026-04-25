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

function getDisplayTemperatureValue(value: number, unit: "Celsius" | "Fahrenheit") {
  if (unit === "Fahrenheit") {
    return (value * 9) / 5 + 32
  }

  return value
}

function formatTemperature(value: number, unit: "Celsius" | "Fahrenheit") {
  const displayValue = getDisplayTemperatureValue(value, unit)
  return `${Math.round(displayValue)}°`
}

function formatChartTemperature(value: number) {
  return `${Math.round(value)}°`
}

function formatWindSpeed(value: number, unit: "m/s" | "km/h") {
  if (unit === "m/s") {
    return `${(value / 3.6).toFixed(1)} m/s`
  }

  return `${Math.round(value)} km/h`
}

function formatPrecipitation(value: number) {
  return `${value.toFixed(1)} mm`
}

function getChartY(value: number, min: number, max: number, height: number) {
  if (max === min) {
    return height / 2
  }

  const topPadding = 12
  const bottomPadding = 28
  const usableHeight = height - topPadding - bottomPadding

  return topPadding + (1 - (value - min) / (max - min)) * usableHeight
}

function getLineStyle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  thickness: number
) {
  const length = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  )
  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI

  return {
    position: "absolute" as const,
    left: (start.x + end.x) / 2 - length / 2,
    top: (start.y + end.y) / 2 - thickness / 2,
    width: length,
    height: thickness,
    borderRadius: thickness / 2,
    backgroundColor: color,
    transform: [{ rotate: `${angle}deg` }],
  }
}

export default function WeatherScreen() {
  const insets = useSafeAreaInsets()
  const { temperatureUnit, windUnit } = useWeatherSettings()

  const [searchText, setSearchText] = useState("")
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedChartIndex, setSelectedChartIndex] = useState(0)

  async function loadWeather(city: string) {
    try {
      setLoading(true)
      setError("")

      const data = await fetchWeatherByCity(city)
      setWeather(data)
      setSearchText(data.city)
      setSelectedChartIndex(0)
    } catch (err) {
      setError("City not found or weather fetch failed")
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

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
      setSelectedChartIndex(0)
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

  const nextHours = weather ? weather.hourly.slice(0, 6) : []
  const chartHours = weather ? weather.hourly.slice(0, 24) : []
  const selectedChartItem = chartHours[selectedChartIndex] || null
  const currentExtraData = weather ? weather.hourly[0] : null

  const chartHeight = 190
  const pointSpacing = 52
  const chartStartX = 24
  const chartWidth = Math.max((chartHours.length - 1) * pointSpacing + 48, 320)

  const temperatureValues = chartHours.map(item =>
    getDisplayTemperatureValue(item.temperature, temperatureUnit)
  )
  const dewPointValues = chartHours.map(item =>
    getDisplayTemperatureValue(item.dewPoint, temperatureUnit)
  )
  const precipitationValues = chartHours.map(item => item.precipitation)

  const temperatureMin = Math.min(...temperatureValues, ...dewPointValues, 0)
  const temperatureMax = Math.max(...temperatureValues, ...dewPointValues, 1)
  const temperatureMiddle = (temperatureMin + temperatureMax) / 2
  const precipitationMax = Math.max(...precipitationValues, 1)
  const precipitationMiddle = precipitationMax / 2

  const temperaturePoints = chartHours.map((item, index) => ({
    x: chartStartX + index * pointSpacing,
    y: getChartY(
      getDisplayTemperatureValue(item.temperature, temperatureUnit),
      temperatureMin,
      temperatureMax,
      chartHeight
    ),
  }))

  const dewPointPoints = chartHours.map((item, index) => ({
    x: chartStartX + index * pointSpacing,
    y: getChartY(
      getDisplayTemperatureValue(item.dewPoint, temperatureUnit),
      temperatureMin,
      temperatureMax,
      chartHeight
    ),
  }))

  const precipitationPoints = chartHours.map((item, index) => ({
    x: chartStartX + index * pointSpacing,
    y: getChartY(item.precipitation, 0, precipitationMax, chartHeight),
  }))

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

            <View style={styles.currentDetailsCard}>
              <Text style={styles.currentDetailsTitle}>Current details</Text>

              <View style={styles.currentDetailsRow}>
                <View style={styles.currentDetailsItem}>
                  <Text style={styles.currentDetailsLabel}>Wind</Text>
                  <Text style={styles.currentDetailsValue}>
                    {formatWindSpeed(weather.windSpeed, windUnit)}
                  </Text>
                </View>

                <View style={styles.currentDetailsItem}>
                  <Text style={styles.currentDetailsLabel}>Precipitation</Text>
                  <Text style={styles.currentDetailsValue}>
                    {formatPrecipitation(weather.precipitation)}
                  </Text>
                </View>
              </View>

              {currentExtraData ? (
                <>
                  <View style={styles.currentDetailsRow}>
                    <View style={styles.currentDetailsItem}>
                      <Text style={styles.currentDetailsLabel}>Humidity</Text>
                      <Text style={styles.currentDetailsValue}>
                        {currentExtraData.humidity}%
                      </Text>
                    </View>

                    <View style={styles.currentDetailsItem}>
                      <Text style={styles.currentDetailsLabel}>Rain chance</Text>
                      <Text style={styles.currentDetailsValue}>
                        {currentExtraData.precipitationProbability}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.currentDetailsRow}>
                    <View style={styles.currentDetailsItem}>
                      <Text style={styles.currentDetailsLabel}>Dew point</Text>
                      <Text style={styles.currentDetailsValue}>
                        {formatTemperature(currentExtraData.dewPoint, temperatureUnit)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.hourlySection}>
              <Text style={styles.hourlyTitle}>Next hours</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyCardsRow}
              >
                {nextHours.map((item, index) => (
                  <View key={`${item.time}-${index}`} style={styles.hourCard}>
                    <Text style={styles.hourText}>{item.time}:00</Text>
                    <Text style={styles.hourMainTemp}>
                      {formatTemperature(item.temperature, temperatureUnit)}
                    </Text>
                    <Text style={styles.hourFeelsLikeText}>
                      Feels like {formatTemperature(item.feelsLike, temperatureUnit)}
                    </Text>

                    <View style={styles.hourInfoRow}>
                      <Text style={styles.hourInfoLabel}>Humidity</Text>
                      <Text style={styles.hourInfoValue}>{item.humidity}%</Text>
                    </View>

                    <View style={styles.hourInfoRow}>
                      <Text style={styles.hourInfoLabel}>Rain chance</Text>
                      <Text style={styles.hourInfoValue}>
                        {item.precipitationProbability}%
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.chartCard}>
              <View style={styles.chartTitleRow}>
                <Text style={styles.chartTitle}>24 hour chart</Text>
                <View style={styles.chartLegendRow}>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendDot, { backgroundColor: colors.accent }]} />
                    <Text style={styles.chartLegendText}>Temp</Text>
                  </View>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendDot, { backgroundColor: colors.textSecondary }]} />
                    <Text style={styles.chartLegendText}>Dew</Text>
                  </View>
                  <View style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendDot, { backgroundColor: colors.textPrimary }]} />
                    <Text style={styles.chartLegendText}>Rain</Text>
                  </View>
                </View>
              </View>

              {selectedChartItem ? (
                <View style={styles.chartPopup}>
                  <Text style={styles.chartPopupTime}>{selectedChartItem.time}:00</Text>
                  <Text style={styles.chartPopupText}>
                    Temp {formatTemperature(selectedChartItem.temperature, temperatureUnit)}
                  </Text>
                  <Text style={styles.chartPopupText}>
                    Feels like {formatTemperature(selectedChartItem.feelsLike, temperatureUnit)}
                  </Text>
                  <Text style={styles.chartPopupText}>
                    Dew point {formatTemperature(selectedChartItem.dewPoint, temperatureUnit)}
                  </Text>
                  <Text style={styles.chartPopupText}>
                    Humidity {selectedChartItem.humidity}%
                  </Text>
                  <Text style={styles.chartPopupText}>
                    Rain chance {selectedChartItem.precipitationProbability}%
                  </Text>
                  <Text style={styles.chartPopupText}>
                    Rain amount {formatPrecipitation(selectedChartItem.precipitation)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.chartRow}>
                <View style={styles.chartAxisColumn}>
                  <Text style={styles.chartAxisText}>
                    {formatChartTemperature(temperatureMax)}
                  </Text>
                  <Text style={styles.chartAxisText}>
                    {formatChartTemperature(temperatureMiddle)}
                  </Text>
                  <Text style={styles.chartAxisText}>
                    {formatChartTemperature(temperatureMin)}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartScrollContent}
                >
                  <View style={[styles.chartCanvas, { width: chartWidth, height: chartHeight }]}>
                    <View style={[styles.chartGridLine, { top: 12 }]} />
                    <View style={[styles.chartGridLine, { top: chartHeight / 2 - 8 }]} />
                    <View style={[styles.chartGridLine, { top: chartHeight - 28 }]} />

                    {temperaturePoints.map((point, index) => {
                      if (index === 0) {
                        return null
                      }

                      return (
                        <View
                          key={`temp-line-${index}`}
                          style={getLineStyle(
                            temperaturePoints[index - 1],
                            point,
                            colors.accent,
                            3
                          )}
                        />
                      )
                    })}

                    {dewPointPoints.map((point, index) => {
                      if (index === 0) {
                        return null
                      }

                      return (
                        <View
                          key={`dew-line-${index}`}
                          style={getLineStyle(
                            dewPointPoints[index - 1],
                            point,
                            colors.textSecondary,
                            3
                          )}
                        />
                      )
                    })}

                    {precipitationPoints.map((point, index) => {
                      if (index === 0) {
                        return null
                      }

                      return (
                        <View
                          key={`rain-line-${index}`}
                          style={getLineStyle(
                            precipitationPoints[index - 1],
                            point,
                            colors.textPrimary,
                            2
                          )}
                        />
                      )
                    })}

                    {chartHours.map((item, index) => {
                      const isSelected = selectedChartIndex === index
                      const temperaturePoint = temperaturePoints[index]
                      const dewPoint = dewPointPoints[index]
                      const precipitationPoint = precipitationPoints[index]

                      return (
                        <View key={`${item.time}-${index}`}>
                          <Pressable
                            style={[
                              styles.chartDotHitArea,
                              {
                                left: temperaturePoint.x - 14,
                                top: temperaturePoint.y - 14,
                              },
                            ]}
                            onPress={() => setSelectedChartIndex(index)}
                          >
                            <View
                              style={[
                                styles.chartDot,
                                styles.chartTempDot,
                                isSelected && styles.chartDotSelected,
                              ]}
                            />
                          </Pressable>

                          <Pressable
                            style={[
                              styles.chartDotHitArea,
                              {
                                left: dewPoint.x - 14,
                                top: dewPoint.y - 14,
                              },
                            ]}
                            onPress={() => setSelectedChartIndex(index)}
                          >
                            <View
                              style={[
                                styles.chartDot,
                                styles.chartDewDot,
                                isSelected && styles.chartDotSelected,
                              ]}
                            />
                          </Pressable>

                          <Pressable
                            style={[
                              styles.chartDotHitArea,
                              {
                                left: precipitationPoint.x - 14,
                                top: precipitationPoint.y - 14,
                              },
                            ]}
                            onPress={() => setSelectedChartIndex(index)}
                          >
                            <View
                              style={[
                                styles.chartDot,
                                styles.chartRainDot,
                                isSelected && styles.chartDotSelected,
                              ]}
                            />
                          </Pressable>

                          <Text
                            style={[
                              styles.chartTimeText,
                              {
                                left: temperaturePoint.x - 16,
                              },
                            ]}
                          >
                            {index % 3 === 0 ? `${item.time}` : ""}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </ScrollView>

                <View style={styles.chartAxisColumn}>
                  <Text style={styles.chartAxisText}>
                    {formatPrecipitation(precipitationMax)}
                  </Text>
                  <Text style={styles.chartAxisText}>
                    {formatPrecipitation(precipitationMiddle)}
                  </Text>
                  <Text style={styles.chartAxisText}>0.0 mm</Text>
                </View>
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

  currentDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 24,
  },
  currentDetailsTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  currentDetailsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  currentDetailsItem: {
    flex: 1,
  },
  currentDetailsLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  currentDetailsValue: {
    color: colors.textPrimary,
    fontSize: 18,
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
  hourlyCardsRow: {
    paddingRight: 4,
  },
  hourCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: 10,
  },
  hourText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  hourMainTemp: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  hourFeelsLikeText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  hourInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  hourInfoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  hourInfoValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  chartCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  chartTitleRow: {
    marginBottom: 12,
  },
  chartTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  chartLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
    marginBottom: 4,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chartLegendText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  chartPopup: {
    backgroundColor: colors.cardDark,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 12,
  },
  chartPopupTime: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  chartPopupText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  chartAxisColumn: {
    width: 50,
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 28,
  },
  chartAxisText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chartScrollContent: {
    paddingHorizontal: 2,
  },
  chartCanvas: {
    position: "relative",
    flex: 1,
  },
  chartGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.outline,
  },
  chartDotHitArea: {
    position: "absolute",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.background,
  },
  chartTempDot: {
    backgroundColor: colors.accent,
  },
  chartDewDot: {
    backgroundColor: colors.textSecondary,
  },
  chartRainDot: {
    backgroundColor: colors.textPrimary,
  },
  chartDotSelected: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  chartTimeText: {
    position: "absolute",
    bottom: 0,
    width: 32,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 11,
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
