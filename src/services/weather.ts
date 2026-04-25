import { HourlyWeatherItem, WeatherData } from '../types/weather'

function getWeatherLabel(code: number) {
  if (code === 0) return 'Clear sky'
  if (code >= 1 && code <= 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code >= 85 && code <= 86) return 'Snow showers'
  if (code >= 95 && code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

function formatHour(timeString: string) {
  const date = new Date(timeString)
  return date.getHours().toString().padStart(2, '0')
}

export async function fetchWeatherByCoordinates(
  latitude: number,
  longitude: number,
  city: string = 'Current location',
  country: string = ''
): Promise<WeatherData> {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
    `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,dew_point_2m,precipitation` +
    `&timezone=auto` +
    `&forecast_days=2`

  const weatherResponse = await fetch(weatherUrl)

  if (!weatherResponse.ok) {
    throw new Error('Weather fetch failed')
  }

  const weatherJson = await weatherResponse.json()

  const current = weatherJson.current
  const hourlyTimes = weatherJson.hourly.time
  const hourlyTemperatures = weatherJson.hourly.temperature_2m
  const hourlyFeelsLike = weatherJson.hourly.apparent_temperature
  const hourlyHumidity = weatherJson.hourly.relative_humidity_2m
  const hourlyPrecipitationProbability = weatherJson.hourly.precipitation_probability
  const hourlyDewPoint = weatherJson.hourly.dew_point_2m
  const hourlyPrecipitation = weatherJson.hourly.precipitation

  const currentHourStart = new Date()
  currentHourStart.setMinutes(0, 0, 0)

  let startIndex = 0

  for (let i = 0; i < hourlyTimes.length; i++) {
    const hourlyDate = new Date(hourlyTimes[i])

    if (hourlyDate.getTime() >= currentHourStart.getTime()) {
      startIndex = i
      break
    }
  }

  const nextHours: HourlyWeatherItem[] = []

  for (let i = startIndex; i < hourlyTimes.length && nextHours.length < 24; i++) {
    nextHours.push({
      time: formatHour(hourlyTimes[i]),
      temperature: Math.round(hourlyTemperatures[i]),
      feelsLike: Math.round(hourlyFeelsLike[i]),
      humidity: Math.round(hourlyHumidity[i]),
      precipitationProbability: Math.round(hourlyPrecipitationProbability[i]),
      dewPoint: Math.round(hourlyDewPoint[i]),
      precipitation: Math.round(hourlyPrecipitation[i] * 10) / 10,
    })
  }

  return {
    city,
    country,
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    weatherLabel: getWeatherLabel(current.weather_code),
    windSpeed: Math.round(current.wind_speed_10m),
    precipitation: Math.round(current.precipitation),
    hourly: nextHours,
  }
}

export async function fetchWeatherByCity(city: string): Promise<WeatherData> {
  const geocodingUrl =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`

  const geocodingResponse = await fetch(geocodingUrl)

  if (!geocodingResponse.ok) {
    throw new Error('City search failed')
  }

  const geocodingData = await geocodingResponse.json()

  if (!geocodingData.results || geocodingData.results.length === 0) {
    throw new Error('City not found')
  }

  const place = geocodingData.results[0]

  return fetchWeatherByCoordinates(
    place.latitude,
    place.longitude,
    place.name,
    place.country
  )
}
