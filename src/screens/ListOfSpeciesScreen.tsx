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

type SortMode = 'relevance' | 'az' | 'za' | 'endangerment'

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

//Yksinkertainen osuvuuspisteytys haulle.
function getMatchScore(item: SpeciesItem, searchText: string) {
  const q = searchText.trim().toLowerCase()
  if (!q) return 0

  const names = [
    item.finnishName?.toLowerCase() || '',
    item.scientificName?.toLowerCase() || '',
  ]

  for (const name of names) {
    if (name === q) return 3
    if (name.startsWith(q)) return 2
    if (name.includes(q)) return 1
  }

  return 0
}

//uhanalaisuusluokan värit 
function getEndangermentColors(code: string) {
  switch (code) {
    case 'RE':
      return { backgroundColor: '#5c0000', textColor: '#ffffff' }
    case 'CR':
      return { backgroundColor: '#8b0000', textColor: '#ffffff' }
    case 'EN':
      return { backgroundColor: '#cc3300', textColor: '#ffffff' }
    case 'VU':
      return { backgroundColor: '#ff6600', textColor: '#ffffff' }
    case 'NT':
      return { backgroundColor: '#f0d232', textColor: '#000000' }
    case 'LC':
      return { backgroundColor: '#8ccf00', textColor: '#000000' }
    case 'DD':
      return { backgroundColor: '#9e9e9e', textColor: '#ffffff' }
    case 'NA':
    default:
      return { backgroundColor: '#f2f2f2', textColor: '#000000' }
  }
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
  const [showSortMenu, setShowSortMenu] = React.useState(false)

  const categoryData: CategoryItem[] = [
    { key: 'fish', title: 'Fish', description: 'Browse fish species.' },
    { key: 'mammals', title: 'Mammals', description: 'Browse mammal species.' },
    { key: 'birds', title: 'Birds', description: 'Browse bird species.' },
    {
      key: 'mushrooms',
      title: 'Mushrooms',
      description: 'Browse mushroom species.',
    },
    { key: 'plants', title: 'Plants', description: 'Browse plant species.' },
  ]

  const handleSearchChange = async (text: string) => {
    setSearchText(text)
    setSelectedCategory(null)
    setShowSortMenu(false)

    if (text.trim()) {
      setSortMode('relevance')
    }

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
    } catch {
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
    setShowSortMenu(false)

    try {
      setLoading(true)
      setError('')
      const data = await getSpeciesByCategory(category)
      setSpecies(data)
    } catch {
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
    setShowSortMenu(false)
  }

  const sortedSpecies = [...species].sort((a, b) => {
    const nameA = (a.finnishName || a.scientificName || '').toLowerCase()
    const nameB = (b.finnishName || b.scientificName || '').toLowerCase()

    // Haussa lähimmät osumat ensin.
    const scoreA = getMatchScore(a, searchText)
    const scoreB = getMatchScore(b, searchText)

    if (searchText.trim() && scoreA !== scoreB) {
      return scoreB - scoreA
    }

    if (sortMode === 'az') {
      return nameA.localeCompare(nameB)
    }

    if (sortMode === 'za') {
      return nameB.localeCompare(nameA)
    }

    if (sortMode === 'endangerment') {
      const codeA =
        endangermentMap[a.scientificName as keyof typeof endangermentMap] ||
        'NA'
      const codeB =
        endangermentMap[b.scientificName as keyof typeof endangermentMap] ||
        'NA'

      const rankA = ENDANGERMENT_PRIORITY[codeA] ?? 0
      const rankB = ENDANGERMENT_PRIORITY[codeB] ?? 0

      if (rankA !== rankB) {
        return rankB - rankA
      }
    }

    return nameA.localeCompare(nameB)
  })

  const showCards = !searchText.trim() && !selectedCategory

  const sortLabelMap: Record<SortMode, string> = {
    relevance: 'Relevance',
    az: 'A-Z',
    za: 'Z-A',
    endangerment: 'Endangerment',
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

        {!!selectedCategory && (
          <Pressable style={styles.categoryBadge} onPress={handleClearCategory}>
            <Text style={styles.categoryBadgeText}>{selectedCategory} ×</Text>
          </Pressable>
        )}

        {!showCards && species.length > 0 && (
          <View style={styles.sortMenuContainer}>
            <Pressable
              style={styles.sortButton}
              onPress={() => setShowSortMenu((prev) => !prev)}
            >
              <Text style={styles.sortButtonText}>
                Sort: {sortLabelMap[sortMode]} ▼
              </Text>
            </Pressable>

            {showSortMenu && (
              <View style={styles.sortDropdown}>
                <Pressable
                  style={styles.sortDropdownItem}
                  onPress={() => {
                    setSortMode('relevance')
                    setShowSortMenu(false)
                  }}
                >
                  <Text style={styles.sortDropdownText}>Relevance</Text>
                </Pressable>

                <Pressable
                  style={styles.sortDropdownItem}
                  onPress={() => {
                    setSortMode('az')
                    setShowSortMenu(false)
                  }}
                >
                  <Text style={styles.sortDropdownText}>A-Z</Text>
                </Pressable>

                <Pressable
                  style={styles.sortDropdownItem}
                  onPress={() => {
                    setSortMode('za')
                    setShowSortMenu(false)
                  }}
                >
                  <Text style={styles.sortDropdownText}>Z-A</Text>
                </Pressable>

                <Pressable
                  style={styles.sortDropdownItem}
                  onPress={() => {
                    setSortMode('endangerment')
                    setShowSortMenu(false)
                  }}
                >
                  <Text style={styles.sortDropdownText}>Endangerment</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {loading && (
          <ActivityIndicator
            style={styles.loader}
            color={colors.textPrimary}
          />
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {showCards ? (
          <FlatList
            key="grid"          
            data={categoryData}
            numColumns={2}
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
            key="list"          
            data={sortedSpecies}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const endangerment =
                endangermentMap[
                  item.scientificName as keyof typeof endangermentMap
                ] || 'NA'

              const badgeColors = getEndangermentColors(endangerment)

              return (
                <View style={styles.speciesCard}>
                  <View style={styles.speciesCardHeader}>
                    <Text style={styles.speciesCardTitle}>
                      {item.finnishName || item.scientificName}
                    </Text>
                  </View>

                  <Text style={styles.speciesCardDescription}>
                    {item.scientificName}
                  </Text>

                  <View
                    style={[
                      styles.endangermentBadge,
                      { backgroundColor: badgeColors.backgroundColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.endangermentBadgeText,
                        { color: badgeColors.textColor },
                      ]}
                    >
                      {endangerment}
                    </Text>
                  </View>
                  {!!item.kingdomScientificName && (
                    <Text style={styles.speciesCardMeta}>
                      {item.kingdomScientificName}
                    </Text>
                  )}
                </View>
              )
            }}
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
  sortMenuContainer: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    zIndex: 10,
  },
  sortButton: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  sortDropdown: {
    marginTop: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  sortDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortDropdownText: {
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
    paddingHorizontal: 6, 
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
    marginBottom: 12,
    flex: 1,          
    marginHorizontal: 6, 
  },
  speciesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speciesCardTitle: {
    color: colors.textPrimary,
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 6,
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
  endangermentBadge: {
    alignSelf: 'flex-start',
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  endangermentBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
})