import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { colors } from './src/theme/colors'
import BottomNav from './src/navigation/BottomNav'
import { setupNotifications } from './src/services/notifications'

export default function App() {
  useEffect(() => {
    setupNotifications()
  }, [])

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <BottomNav />
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})