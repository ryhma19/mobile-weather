import React from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { colors } from '../theme/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getSpeciesByCategory,
  getSpeciesById,
  searchSpecies,
  SpeciesDetail,
  SpeciesItem,
} from '../services/species'
import endangermentMap from '../../assets/endangerment.json'

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type Category = string
type SortMode = 'relevance' | 'az' | 'za' | 'endangerment'

type CategoryGroup = {
  mvlId: string
  titleFi: string
  title: string
}

const CATEGORY_DATA: CategoryGroup[] = [
  { mvlId: 'MVL.1',   title: 'Birds',               titleFi: 'Linnut' },
  { mvlId: 'MVL.2',   title: 'Mammals',              titleFi: 'Nisäkkäät' },
  { mvlId: 'MVL.22',  title: 'Algae',                titleFi: 'Levät' },
  { mvlId: 'MVL.23',  title: 'Mosses',               titleFi: 'Sammalet' },
  { mvlId: 'MVL.232', title: 'Insects & Arachnids',  titleFi: 'Hyönteiset ja hämähäkkieläimet' },
  { mvlId: 'MVL.233', title: 'Fungi & Lichens',       titleFi: 'Sienet ja jäkälät' },
  { mvlId: 'MVL.26',  title: 'Reptiles & Amphibians', titleFi: 'Matelijat ja sammakkoeläimet' },
  { mvlId: 'MVL.27',  title: 'Fish',                 titleFi: 'Kalat' },
  { mvlId: 'MVL.28',  title: 'Worms',                titleFi: 'Madot' },
  { mvlId: 'MVL.343', title: 'Vascular Plants',       titleFi: 'Putkilokasvit' },
  { mvlId: 'MVL.37',  title: 'Myriapods',             titleFi: 'Tuhatjalkaiset' },
  { mvlId: 'MVL.39',  title: 'Crustaceans',           titleFi: 'Äyriäiset' },
  { mvlId: 'MVL.40',  title: 'Molluscs',              titleFi: 'Nilviäiset' },
  { mvlId: 'MVL.41',  title: 'Other Organisms',       titleFi: 'Muut organismit' },
]

const FOREIGN_KEY = 'FOREIGN'

const ENDANGERMENT_PRIORITY: Record<string, number> = {
  RE: 7, CR: 6, EN: 5, VU: 4, NT: 3, LC: 2, DD: 1, NA: 0,
}

const ENDANGERMENT_DESCRIPTIONS: Record<string, { en: string; fi: string }> = {
  RE: { en: 'Regionally Extinct',    fi: 'Hävinnyt alueelta' },
  CR: { en: 'Critically Endangered', fi: 'Äärimmäisen uhanalainen' },
  EN: { en: 'Endangered',            fi: 'Erittäin uhanalainen' },
  VU: { en: 'Vulnerable',            fi: 'Vaarantunut' },
  NT: { en: 'Near Threatened',       fi: 'Silmälläpidettävä' },
  LC: { en: 'Least Concern',         fi: 'Elinvoimainen' },
  DD: { en: 'Data Deficient',        fi: 'Puutteellisesti tunnettu' },
  NA: { en: 'Not Assessed',          fi: 'Arvioimatta jätetty' },
}

const SORT_LABELS: Record<SortMode, string> = {
  relevance: 'Relevance', az: 'A-Z', za: 'Z-A', endangerment: 'Endangerment',
}

function getMatchScore(item: SpeciesItem, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  for (const name of [item.finnishName?.toLowerCase() ?? '', item.scientificName?.toLowerCase() ?? '']) {
    if (name === q) return 3
    if (name.startsWith(q)) return 2
    if (name.includes(q)) return 1
  }
  return 0
}

function getEndangermentColors(code: string) {
  switch (code) {
    case 'RE': return { bg: '#5c0000', text: '#ffffff' }
    case 'CR': return { bg: '#8b0000', text: '#ffffff' }
    case 'EN': return { bg: '#cc3300', text: '#ffffff' }
    case 'VU': return { bg: '#ff6600', text: '#ffffff' }
    case 'NT': return { bg: '#f0d232', text: '#000000' }
    case 'LC': return { bg: '#8ccf00', text: '#000000' }
    case 'DD': return { bg: '#9e9e9e', text: '#ffffff' }
    default:   return { bg: '#f2f2f2', text: '#000000' }
  }
}

function EndangermentBadge({ scientificName }: { scientificName: string }) {
  const code = (endangermentMap as Record<string, string>)[scientificName] ?? 'NA'
  const { bg, text } = getEndangermentColors(code)
  const [showPopup, setShowPopup] = React.useState(false)
  const desc = ENDANGERMENT_DESCRIPTIONS[code]

  return (
    <View>
      <Pressable
        style={[styles.badge, { backgroundColor: bg }]}
        onPress={e => { e.stopPropagation?.(); setShowPopup(v => !v) }}
      >
        <Text style={[styles.badgeText, { color: text }]}>{code}</Text>
      </Pressable>
      {showPopup && (
        <View style={styles.badgePopup}>
          <View style={styles.badgePopupTail} />
          <Text style={styles.badgePopupEn}>{desc.en}</Text>
          <Text style={styles.badgePopupFi}>{desc.fi}</Text>
        </View>
      )}
    </View>
  )
}

function AccordionSection({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <View style={accordionStyles.container}>
      <Pressable
        style={accordionStyles.header}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          setOpen(v => !v)
        }}
      >
        <Text style={accordionStyles.title}>{title}</Text>
        <Text style={accordionStyles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={accordionStyles.body}>
          <Text style={accordionStyles.text}>{text}</Text>
        </View>
      )}
    </View>
  )
}

const accordionStyles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  title: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  chevron: { color: colors.textSecondary, fontSize: 11, marginLeft: 8 },
  body: { paddingBottom: 14, paddingHorizontal: 4 },
  text: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
})

export default function ListOfSpeciesScreen() {
  const insets = useSafeAreaInsets()

  const [searchText, setSearchText] = React.useState('')
  const [species, setSpecies] = React.useState<SpeciesItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null)
  const [sortMode, setSortMode] = React.useState<SortMode>('az')
  const [showSortMenu, setShowSortMenu] = React.useState(false)
  const [selectedSpecies, setSelectedSpecies] = React.useState<SpeciesDetail | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [detailError, setDetailError] = React.useState('')

  const fetchCategory = async (category: Category) => {
    setSelectedCategory(category)
    setSearchText('')
    setShowSortMenu(false)
    setSelectedSpecies(null)
    setDetailError('')
    setSortMode('az')
    try {
      setLoading(true)
      setError('')
      if (category === FOREIGN_KEY) {
       
        const allMvlIds = CATEGORY_DATA.map(c => c.mvlId)
        const results = await Promise.all(
          allMvlIds.map(id =>
            fetch(`http://10.0.2.2:3001/species/category/${encodeURIComponent(id)}/foreign`)
              .then(r => r.json())
              .catch(() => [])
          )
        )
        const seen = new Set<string>()
        const combined = results.flat().filter(s => {
          if (seen.has(s.id)) return false
          seen.add(s.id)
          return true
        })
        setSpecies(combined)
      } else {
        setSpecies(await getSpeciesByCategory(category as any))
      }
    } catch {
      setError('Failed to load species.')
      setSpecies([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (text: string) => {
    setSearchText(text)
    setSelectedCategory(null)
    setShowSortMenu(false)
    setSelectedSpecies(null)
    setDetailError('')
    if (!text.trim()) {
      setSpecies([])
      setError('')
      return
    }
    setSortMode('relevance')
    try {
      setLoading(true)
      setError('')
      setSpecies(await searchSpecies(text))
    } catch {
      setError('Failed to load species.')
      setSpecies([])
    } finally {
      setLoading(false)
    }
  }

  const handleSpeciesPress = async (id: string) => {
    try {
      setDetailLoading(true)
      setDetailError('')
      setSelectedSpecies(await getSpeciesById(id))
    } catch {
      setDetailError('Failed to load species information.')
    } finally {
      setDetailLoading(false)
    }
  }

  const clearAll = () => {
    setSelectedCategory(null)
    setSpecies([])
    setError('')
    setShowSortMenu(false)
    setSelectedSpecies(null)
    setDetailError('')
  }

  const sortedSpecies = React.useMemo(() => [...species].sort((a, b) => {
    const nameA = (a.finnishName || a.scientificName || '').toLowerCase()
    const nameB = (b.finnishName || b.scientificName || '').toLowerCase()
    if (searchText.trim()) {
      const diff = getMatchScore(b, searchText) - getMatchScore(a, searchText)
      if (diff !== 0) return diff
    }
    if (sortMode === 'za') return nameB.localeCompare(nameA)
    if (sortMode === 'endangerment') {
      const rankA = ENDANGERMENT_PRIORITY[(endangermentMap as Record<string, string>)[a.scientificName] ?? 'NA'] ?? 0
      const rankB = ENDANGERMENT_PRIORITY[(endangermentMap as Record<string, string>)[b.scientificName] ?? 'NA'] ?? 0
      if (rankA !== rankB) return rankB - rankA
    }
    return nameA.localeCompare(nameB)
  }), [species, sortMode, searchText])

  const showCategories = !searchText.trim() && !selectedCategory

  if (selectedSpecies || detailLoading || detailError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.content}>
          <Pressable style={styles.backButton} onPress={() => { setSelectedSpecies(null); setDetailError('') }}>
            <Text style={styles.backButtonText}>← Back to list</Text>
          </Pressable>

          {detailLoading && <ActivityIndicator color={colors.textPrimary} />}
          {!!detailError && <Text style={styles.errorText}>{detailError}</Text>}

          {!!selectedSpecies && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
              <View style={styles.detailCard}>
                {!!selectedSpecies.imageUrl && (
                  <Image
                    source={{ uri: selectedSpecies.imageUrl }}
                    style={styles.detailHeroImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.detailCardBody}>
                  <Text style={styles.detailFinnishName}>
                    {selectedSpecies.finnishName || selectedSpecies.scientificName}
                  </Text>
                  <Text style={styles.detailScientificName}>{selectedSpecies.scientificName}</Text>

                  <View style={{ marginBottom: 16 }}>
                    <EndangermentBadge scientificName={selectedSpecies.scientificName} />
                  </View>

                  {(!!selectedSpecies.kingdomScientificName || selectedSpecies.informalGroups.length > 0) && (
                    <View style={styles.metaSection}>
                      {!!selectedSpecies.kingdomScientificName && (
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Kingdom</Text>
                          <Text style={styles.metaValue}>{selectedSpecies.kingdomScientificName}</Text>
                        </View>
                      )}
                      {selectedSpecies.informalGroups.length > 0 && (
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Groups</Text>
                          <Text style={styles.metaValue}>{selectedSpecies.informalGroups.join(', ')}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {selectedSpecies.infoSections.map((section, i) => (
                    <AccordionSection key={`${section.title}-${i}`} title={section.title} text={section.text} />
                  ))}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: 60 }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Species</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search species by name"
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={handleSearch}
        />

        {!!selectedCategory && (
          <Pressable style={styles.categoryBadge} onPress={clearAll}>
            <Text style={styles.categoryBadgeText}>
              {selectedCategory === FOREIGN_KEY
                ? 'Muut lajit ×'
                : `${CATEGORY_DATA.find(c => c.mvlId === selectedCategory)?.titleFi ?? selectedCategory} ×`}
            </Text>
          </Pressable>
        )}

        {!showCategories && species.length > 0 && (
          <View style={styles.sortMenuContainer}>
            <Pressable style={styles.sortButton} onPress={() => setShowSortMenu(v => !v)}>
              <Text style={styles.sortButtonText}>Sort: {SORT_LABELS[sortMode]} ▼</Text>
            </Pressable>
            {showSortMenu && (
              <View style={styles.sortDropdown}>
                {(Object.keys(SORT_LABELS) as SortMode[]).map(mode => (
                  <Pressable key={mode} style={styles.sortDropdownItem} onPress={() => { setSortMode(mode); setShowSortMenu(false) }}>
                    <Text style={styles.sortDropdownText}>{SORT_LABELS[mode]}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {loading && <ActivityIndicator style={{ marginBottom: 16 }} color={colors.textPrimary} />}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {showCategories ? (
          <FlatList
            data={CATEGORY_DATA}
            keyExtractor={item => item.mvlId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListFooterComponent={
              <Pressable style={styles.categoryGroup} onPress={() => fetchCategory(FOREIGN_KEY)}>
                <View style={styles.categoryRow}>
                  <View>
                    <Text style={styles.categoryCardTitle}>Muut lajit</Text>
                    <Text style={styles.categoryCardSubtitle}>Lajit jotka eivät esiinny Suomessa</Text>
                  </View>
                  <Text style={styles.categoryCardArrow}>→</Text>
                </View>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.categoryGroup} onPress={() => fetchCategory(item.mvlId)}>
                <View style={styles.categoryRow}>
                  <View>
                    <Text style={styles.categoryCardTitle}>{item.titleFi}</Text>
                    <Text style={styles.categoryCardSubtitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.categoryCardArrow}>→</Text>
                </View>
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={sortedSpecies}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => (
              <Pressable style={styles.speciesCard} onPress={() => handleSpeciesPress(item.id)}>
                <View style={styles.speciesCardRow}>
                  <View style={styles.speciesCardNames}>
                    <Text style={styles.speciesCardTitle} numberOfLines={1}>
                      {item.finnishName || item.scientificName}
                    </Text>
                    <Text style={styles.speciesCardScientific} numberOfLines={1}>
                      {item.scientificName}
                    </Text>
                    {!!item.kingdomScientificName && (
                      <Text style={styles.speciesCardMeta} numberOfLines={1}>
                        {item.kingdomScientificName}
                      </Text>
                    )}
                  </View>
                  <EndangermentBadge scientificName={item.scientificName} />
                </View>
              </Pressable>
            )}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No species found.</Text> : null}
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
  errorText: {
    color: '#ffb3b3',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryGroup: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryCardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  categoryCardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  categoryCardArrow: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  // Species list
  speciesCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 12,
  },
  speciesCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  speciesCardNames: {
    flex: 1,
  },
  speciesCardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  speciesCardScientific: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  speciesCardMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgePopup: {
    marginTop: 10,
    backgroundColor: 'rgba(20,20,30,0.88)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  badgePopupTail: {
    position: 'absolute',
    top: -7,
    left: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(20,20,30,0.88)',
  },
  badgePopupEn: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  badgePopupFi: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  // Detail view
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  detailHeroImage: {
    width: '100%',
    height: 220,
  },
  detailCardBody: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  detailFinnishName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailScientificName: {
    color: colors.textSecondary,
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  metaSection: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 13,
    flex: 2,
    textAlign: 'right',
  },
})
