import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import OverviewScreen from './src/screens/OverviewScreen'
import MapScreen from './src/screens/MapScreen'
import ListOfSpeciesScreen from './src/screens/ListOfSpeciesScreen'
import { colors } from './src/theme/colors'

export default function App() {
  // Hallitaan näkymien vaihtoa ilman erillistä navigointikirjastoa.
  const [currentScreen, setCurrentScreen] = React.useState<'overview' | 'map' | 'listOfSpecies'>('overview')

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {currentScreen === 'overview' ? (
        // Overview avaa kartan painamalla "Map overview" korttia.
        <OverviewScreen
          onOpenMap={() => setCurrentScreen('map')}
          onOpenListOfSpecies={() => setCurrentScreen('listOfSpecies')}
        />
      ) : currentScreen === 'map' ? (
        // Vasemmalla nuoli palauttaa takaisin pääsivulle.
        <MapScreen onGoBack={() => setCurrentScreen('overview')} />
      ) : (
        // Vasemmalla nuoli palauttaa takaisin pääsivulle.
        <ListOfSpeciesScreen onGoBack={() => setCurrentScreen('overview')} />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})