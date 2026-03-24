import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type ListOfSpeciesScreenProps = {
  // callback jolla palataan takaisin pääsivulle.
  onGoBack?: () => void
}

type SpeciesCardProps = {
  title: string
  description: string
}

function SpeciesCard({ title, description }: SpeciesCardProps) {
  return (
    <View style={styles.speciesCard}>
      <View style={styles.speciesCardHeader}>
        <Text style={styles.speciesCardTitle}>{title}</Text>
        <Text style={styles.speciesCardArrow}>→</Text>
      </View>
      <Text style={styles.speciesCardDescription}>{description}</Text>
    </View>
  )
}

export default function ListOfSpeciesScreen({
  onGoBack,
}: ListOfSpeciesScreenProps) {
  const insets = useSafeAreaInsets()
  return (
    <View
            style={[
              styles.container,
              {
                paddingTop: insets.top + 12,
              },
            ]}
          >
      <View style={styles.content}>
        <Text style={styles.title}>List of species</Text>

        <View style={styles.cardsContainer}>
          <SpeciesCard
            title="Animals"
            description="Placeholder card for browsing animal species."
          />
          <SpeciesCard
            title="Plants"
            description="Placeholder card for browsing plant species."
          />
          <SpeciesCard
            title="Mushrooms"
            description="Placeholder card for browsing mushroom species."
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 14,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 12,
  },
  speciesCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 110,
    justifyContent: 'center',
  },
  speciesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speciesCardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  speciesCardArrow: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  speciesCardDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
})