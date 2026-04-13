import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { onAuthStateChanged, User } from 'firebase/auth'
import { colors } from './src/theme/colors'
import BottomNav from './src/navigation/BottomNav'
import AuthStack from './src/navigation/AuthStack'
import { setupNotifications } from './src/services/notifications'
import { auth } from './src/services/firebase'
import { WeatherSettingsProvider } from './src/context/WeatherSettingsContext'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    setupNotifications()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser)
      setAuthLoading(false)
    })
  
    return unsubscribe
  }, [])

  if (authLoading) {
    return null
  }

  return (
    <SafeAreaProvider>
      <WeatherSettingsProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          {user ? <BottomNav /> : <AuthStack />}
        </NavigationContainer>
      </WeatherSettingsProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})