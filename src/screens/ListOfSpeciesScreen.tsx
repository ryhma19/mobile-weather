import React from 'react'
import {ActivityIndicator,  FlatList, Pressable, StyleSheet, Text, View, TextInput,} from 'react-native'
import {colors} from '../theme/colors'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {getSpeciesByCategory, searchSpecies, SpeciesItem,} from '../services/species'
import endangermentMap from '../../assets/endangerment.json'

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

type SortMode = 'az' | 'za' | 'endangerment'

const ENDANGERMENT_PRIORITY: Record<string, number> = {
  RE: 7,
  CR: 6,
  EN: 5,
  VU: 4,
  NT: 3,
  LC: 2,
  DD: 1,
  NA: 0,
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
  const [sortMode, setSortMode] = React.useState<SortMode>('az')

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

  const toggleSort = () => {
    setSortMode((prev) => {
      if (prev === 'az') return 'za'
      if (prev === 'za') return 'endangerment'
      return 'az'
    })
  }

  const sortedSpecies = [...species].sort((a, b) => {
    const nameA = (a.finnishName || a.scientificName).toLowerCase()
    const nameB = (b.finnishName || b.scientificName).toLowerCase()

    if (sortMode === 'az') {
      return nameA.localeCompare(nameB)
    }

    if (sortMode === 'za') {
      return nameB.localeCompare(nameA)
    }

    const codeA =
      endangermentMap[a.scientificName as keyof typeof endangermentMap] || 'NA'
    const codeB =
      endangermentMap[b.scientificName as keyof typeof endangermentMap] || 'NA'

    const rankA = ENDANGERMENT_PRIORITY[codeA] ?? 0
    const rankB = ENDANGERMENT_PRIORITY[codeB] ?? 0

    if (rankA !== rankB) {
      return rankB - rankA
    }

    return nameA.localeCompare(nameB)
  })

  const showCards = !searchText.trim() && !selectedCategory

  const sortLabel =
    sortMode === 'az'
      ? 'A-Z'
      : sortMode === 'za'
      ? 'Z-A'
      : 'Endangerment'

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

        {!showCards && species.length > 0 && (
          <Pressable style={styles.sortButton} onPress={toggleSort}>
            <Text style={styles.sortButtonText}>
              Sort: {sortLabel}
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
            data={sortedSpecies}
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
                <Text style={styles.speciesCardMeta}>
                  Endangerment: {endangermentMap[item.scientificName as keyof typeof endangermentMap] || 'NA'}
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
  sortButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  sortButtonText: {
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