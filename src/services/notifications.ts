import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

Notifications.setNotificationHandler({
  handleNotification: async() => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("weather-alerts",{
      name: "Weather Alerts",
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  if (!Device.isDevice){
    return false
  }
  const {status: existingStatus} = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== "granted"){
    const {status} = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  return finalStatus === "granted"
}

export async function sendTestWeatherNotification(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sääilmoitus",
      body: message,
    },
    trigger: null,
  })
}