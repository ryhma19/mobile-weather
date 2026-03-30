import React from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
} from 'react-native'
import { colors } from '../theme/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { searchSpecies, SpeciesItem } from '../services/species'

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

  // Hakukentän tila 
  const [searchText, setSearchText] = React.useState('')
  const [species, setSpecies] = React.useState<SpeciesItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSearchChange = async (text: string) => {
    setSearchText(text)

    if (!text.trim()) {
      setSpecies([])
      setError('')
      return
    }

    try {
      setLoading(true)
      setError('')
      const data = await searchSpecies(text)
      setSpecies(data)
    } catch (err) {
      setError('Failed to load species.')
      setSpecies([])
    } finally {
      setLoading(false)
    }
  }

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

        {/* Hakupalkki lajien hakemiseen nimellä. */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search species by name"
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={handleSearchChange}
        />

        {loading && <ActivityIndicator style={styles.loader} color={colors.textPrimary} />}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {!searchText.trim() ? (
          <View style={styles.cardsContainer}>
            <SpeciesCard
              title="Fish"
              description="fishes"
            />
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
        ) : (
          <FlatList
            data={species}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.speciesCard}>
                <View style={styles.speciesCardHeader}>
                  <Text style={styles.speciesCardTitle}>
                    {item.finnishName || item.scientificName}
                  </Text>
                </View>
                <Text style={styles.speciesCardDescription}>
                  {item.scientificName}
                </Text>
                {!!item.taxonRank && (
                  <Text style={styles.speciesCardMeta}>{item.taxonRank}</Text>
                )}
              </View>
            )}
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.emptyText}>No species found.</Text>
              ) : null
            }
          />
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
  searchInput: {
    backgroundColor: colors.surfaceVariant,
    color: colors.textPrimary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  loader: {
    marginBottom: 16,
  },
  errorText: {
    color: '#ffb3b3',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  speciesCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 110,
    justifyContent: 'center',
    marginBottom: 12,
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
  speciesCardMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
})