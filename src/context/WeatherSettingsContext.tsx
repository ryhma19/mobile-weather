import React, { createContext, useContext, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type TemperatureUnit = "Celsius" | "Fahrenheit"
type WindUnit = "m/s" | "km/h"

type WeatherSettingsContextType = {
  temperatureUnit: TemperatureUnit
  setTemperatureUnit: (value: TemperatureUnit) => void
  windUnit: WindUnit
  setWindUnit: (value: WindUnit) => void
}

const WeatherSettingsContext = createContext<WeatherSettingsContextType | undefined>(undefined)

const TEMPERATURE_UNIT_KEY = "temperatureUnit"
const WIND_UNIT_KEY = "windUnit"

export function WeatherSettingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>("Celsius")
  const [windUnit, setWindUnit] = useState<WindUnit>("m/s")
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const savedTemperatureUnit = await AsyncStorage.getItem(TEMPERATURE_UNIT_KEY)
        const savedWindUnit = await AsyncStorage.getItem(WIND_UNIT_KEY)

        if (
          savedTemperatureUnit === "Celsius" ||
          savedTemperatureUnit === "Fahrenheit"
        ) {
          setTemperatureUnit(savedTemperatureUnit)
        }

        if (savedWindUnit === "m/s" || savedWindUnit === "km/h") {
          setWindUnit(savedWindUnit)
        }
      } catch (error) {
      } finally {
        setHasLoadedSettings(true)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    if (!hasLoadedSettings) {
      return
    }

    AsyncStorage.setItem(TEMPERATURE_UNIT_KEY, temperatureUnit)
  }, [temperatureUnit, hasLoadedSettings])

  useEffect(() => {
    if (!hasLoadedSettings) {
      return
    }

    AsyncStorage.setItem(WIND_UNIT_KEY, windUnit)
  }, [windUnit, hasLoadedSettings])

  return (
    <WeatherSettingsContext.Provider
      value={{
        temperatureUnit,
        setTemperatureUnit,
        windUnit,
        setWindUnit,
      }}
    >
      {children}
    </WeatherSettingsContext.Provider>
  )
}

export function useWeatherSettings() {
  const context = useContext(WeatherSettingsContext)

  if (!context) {
    throw new Error("useWeatherSettings must be used inside WeatherSettingsProvider")
  }

  return context
}