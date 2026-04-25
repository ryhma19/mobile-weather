export type HourlyWeatherItem = {
  time: string
  temperature: number
  feelsLike: number
  humidity: number
  precipitationProbability: number
  dewPoint: number
  precipitation: number
}

export type WeatherData = {
  city: string
  country: string
  temperature: number
  feelsLike: number
  weatherLabel: string
  windSpeed: number
  precipitation: number
  hourly: HourlyWeatherItem[]
}
