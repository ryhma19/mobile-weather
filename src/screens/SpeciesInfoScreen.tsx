import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'
import { getSpeciesById, SpeciesDetail } from '../services/species'

type SpeciesInfoScreenProps = {
  speciesId: string
  onGoBack?: () => void
}

export default function SpeciesInfoScreen({
  speciesId,
  onGoBack,
}: SpeciesInfoScreenProps) {
  const insets = useSafeAreaInsets()
  const [species, setSpecies] = React.useState<SpeciesDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    const loadSpecies = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getSpeciesById(speciesId)
        setSpecies(data)
      } catch (err) {
        setError('Failed to load species information.')
      } finally {
        setLoading(false)
      }
    }

    loadSpecies()
  }, [speciesId])

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
        <Pressable style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        {loading && <ActivityIndicator color={colors.textPrimary} />}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {!!species && (
          <View style={styles.card}>
            <Text style={styles.title}>
              {species.finnishName || species.scientificName}
            </Text>
            <Text style={styles.subtitle}>{species.scientificName}</Text>
            <Text style={styles.info}>ID: {species.id}</Text>
            <Text style={styles.info}>Rank: {species.taxonRank}</Text>
            <Text style={styles.info}>
              Kingdom: {species.kingdomScientificName}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 18,
    marginBottom: 16,
  },
  info: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  errorText: {
    color: '#ffb3b3',
    marginTop: 12,
  },
})