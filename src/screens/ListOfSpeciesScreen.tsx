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
import {
  getSpeciesByCategory,
  searchSpecies,
  SpeciesItem,
} from '../services/species'

type ListOfSpeciesScreenProps = {
  // callback jolla palataan takaisin pääsivulle.
  onGoBack?: () => void
}

type SpeciesCardProps = {
  title: string
  description: string
  onPress?: () => void
}

type CategoryItem = {
  key: 'fish' | 'mammals' | 'birds' | 'mushrooms' | 'plants'
  title: string
  description: string
}

function SpeciesCard({ title, description, onPress }: SpeciesCardProps) {
  return (
    <Pressable style={styles.speciesCard} onPress={onPress}>
      <View style={styles.speciesCardHeader}>
        <Text style={styles.speciesCardTitle}>{title}</Text>
        <Text style={styles.speciesCardArrow}>→</Text>
      </View>
      <Text style={styles.speciesCardDescription}>{description}</Text>
    </Pressable>
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
  const [selectedCategory, setSelectedCategory] = React.useState<
    'fish' | 'mammals' | 'birds' | 'mushrooms' | 'plants' | null
  >(null)

  const categoryData: CategoryItem[] = [
    {
      key: 'fish',
      title: 'Fish',
      description: 'Browse fish species.',
    },
    {
      key: 'mammals',
      title: 'Mammals',
      description: 'Browse mammal species.',
    },
    {
      key: 'birds',
      title: 'Birds',
      description: 'Browse bird species.',
    },
    {
      key: 'mushrooms',
      title: 'Mushrooms',
      description: 'Browse mushroom species.',
    },
    {
      key: 'plants',
      title: 'Plants',
      description: 'Browse plant species.',
    },
  ]

  const handleSearchChange = async (text: string) => {
    setSearchText(text)
    setSelectedCategory(null)

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

  const handleCategoryPress = async (
    category: 'fish' | 'mammals' | 'birds' | 'mushrooms' | 'plants'
  ) => {
    setSelectedCategory(category)
    setSearchText('')

    try {
      setLoading(true)
      setError('')
      const data = await getSpeciesByCategory(category)
      setSpecies(data)
    } catch (err) {
      setError('Failed to load species.')
      setSpecies([])
    } finally {
      setLoading(false)
    }
  }

  const handleClearCategory = () => {
    setSelectedCategory(null)
    setSpecies([])
    setError('')
  }

  const showCards = !searchText.trim() && !selectedCategory

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

        {!!selectedCategory && (
          <Pressable style={styles.categoryBadge} onPress={handleClearCategory}>
            <Text style={styles.categoryBadgeText}>
              {selectedCategory} ×
            </Text>
          </Pressable>
        )}

        {loading && <ActivityIndicator style={styles.loader} color={colors.textPrimary} />}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {showCards ? (
          <FlatList
            data={categoryData}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            renderItem={({ item }) => (
              <SpeciesCard
                title={item.title}
                description={item.description}
                onPress={() => handleCategoryPress(item.key)}
              />
            )}
          />
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
                {!!item.kingdomScientificName && (
                  <Text style={styles.speciesCardMeta}>
                    {item.kingdomScientificName}
                  </Text>
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
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  categoryBadgeText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
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
    paddingBottom: 120,
  },
  listContent: {
    paddingBottom: 120,
  },
  speciesCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    minHeight: 100,
    justifyContent: 'center',
    marginBottom: 8,
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
    marginTop: 6,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
})