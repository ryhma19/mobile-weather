import React from 'react'
import {
  ActivityIndicator,
  Dimensions,
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
import Svg, { G, Path, Text as SvgText } from 'react-native-svg'
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

//androidin asetteluanimaatiot
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

//kategoriat MVL-tunnuksineen suomeksi ja englanniksi
const CATEGORY_DATA: CategoryGroup[] = [
  { mvlId: 'MVL.1',   title: 'Birds',               titleFi: 'Linnut' },
  { mvlId: 'MVL.2',   title: 'Mammals',              titleFi: 'Nisäkkäät' },
  { mvlId: 'MVL.22',  title: 'Algae',                titleFi: 'Levät' },
  { mvlId: 'MVL.23',  title: 'Mosses',               titleFi: 'Sammalet' },
  { mvlId: 'MVL.232', title: 'Insects & Arachnids',  titleFi: 'Hyönteiset ja hämähäkkieläimet' },
  { mvlId: 'MVL.233', title: 'Fungi & Lichens',      titleFi: 'Sienet ja jäkälät' },
  { mvlId: 'MVL.26',  title: 'Reptiles & Amphibians', titleFi: 'Matelijat ja sammakkoeläimet' },
  { mvlId: 'MVL.27',  title: 'Fish',                 titleFi: 'Kalat' },
  { mvlId: 'MVL.28',  title: 'Worms',                titleFi: 'Madot' },
  { mvlId: 'MVL.343', title: 'Vascular Plants',      titleFi: 'Putkilokasvit' },
  { mvlId: 'MVL.37',  title: 'Myriapods',            titleFi: 'Tuhatjalkaiset' },
  { mvlId: 'MVL.39',  title: 'Crustaceans',          titleFi: 'Äyriäiset' },
  { mvlId: 'MVL.40',  title: 'Molluscs',             titleFi: 'Nilviäiset' },
  { mvlId: 'MVL.41',  title: 'Other Organisms',      titleFi: 'Muut organismit' },
]

//avain ulkomaisille lajeille 
const FOREIGN_KEY = 'FOREIGN'

//uhanalaisuusluokkien järjestys vakavimmasta turvallisimpaan
const ENDANGERMENT_PRIORITY: Record<string, number> = {
  RE: 7, CR: 6, EN: 5, VU: 4, NT: 3, LC: 2, DD: 1, NA: 0,
}

//uhanalaisuuskoodien kuvaukset suomeksi ja englanniksi
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

//uhanalaisuuskoodien värit ja suomenkieliset nimet
const ENDANGERMENT_META: Record<string, { labelFi: string; color: string }> = {
  RE: { labelFi: 'Hävinnyt',                 color: '#5c0000' },
  CR: { labelFi: 'Äärimmäisen uhanalainen',  color: '#8b0000' },
  EN: { labelFi: 'Erittäin uhanalainen',     color: '#cc3300' },
  VU: { labelFi: 'Vaarantunut',              color: '#e86800' },
  NT: { labelFi: 'Silmälläpidettävä',        color: '#c9a800' },
  LC: { labelFi: 'Elinvoimainen',            color: '#4a8f00' },
  DD: { labelFi: 'Puutteellisesti tunnettu', color: '#5a6070' },
  NA: { labelFi: 'Arvioimatta',              color: '#2a3448' },
}

//lajittelutilat käyttöliittymässä näytettävinä niminä
const SORT_LABELS: Record<SortMode, string> = {
  relevance: 'Relevance', az: 'A-Ö', za: 'Ö-A', endangerment: 'Endangerment',
}

//donitsikaavioon tarvittavat vakiot
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PIE_SIZE = Math.min(SCREEN_WIDTH - 80, 220)
const PIE_R = PIE_SIZE / 2
const PIE_INNER_R = PIE_R * 0.52
const PIE_CX = PIE_R
const PIE_CY = PIE_R

//muunnetaan kulma-arvo karteesisiksi koordinaateiksi ympyrän kehällä
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

//rakennetaan SVG-polku yhdelle rengaskaavion siivulle
function slicePath(cx: number, cy: number, r: number, ir: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0
  const o1 = polarToCartesian(cx, cy, r, start)
  const o2 = polarToCartesian(cx, cy, r, end)
  const i1 = polarToCartesian(cx, cy, ir, end)
  const i2 = polarToCartesian(cx, cy, ir, start)
  return `M ${o1.x} ${o1.y} A ${r} ${r} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${ir} ${ir} 0 ${large} 0 ${i2.x} ${i2.y} Z`
}

type SliceData = { code: string; labelFi: string; count: number; color: string; percentage: number }

//lasketaan donitsikaavioon tarvittavat siivut lajinimien perusteella
function buildSlices(names: string[]): SliceData[] {
  const map = endangermentMap as Record<string, string>
  const counts: Record<string, number> = {}
  for (const n of names) {
    const code = map[n] ?? 'NA'
    counts[code] = (counts[code] ?? 0) + 1
  }
  const total = names.length || 1
  return ['RE','CR','EN','VU','NT','LC','DD','NA']
    .filter(c => (counts[c] ?? 0) > 0)
    .map(c => ({
      code: c,
      labelFi: ENDANGERMENT_META[c].labelFi,
      count: counts[c] ?? 0,
      color: ENDANGERMENT_META[c].color,
      percentage: ((counts[c] ?? 0) / total) * 100,
    }))
}

//donitsikaaviokomponentti, painettavat siivut ja keskiteksti
function DonutChart({ slices, active, onPress }: {
  slices: SliceData[]
  active: string | null
  onPress: (code: string) => void
}) {
  const total = slices.reduce((a, b) => a + b.count, 0)
  const activeSlice = slices.find(s => s.code === active)
  let angle = 0
  const ranges = slices.map(s => {
    const start = angle
    angle += (s.count / total) * 360
    return { ...s, startAngle: start, endAngle: angle }
  })
  return (
    <Svg width={PIE_SIZE} height={PIE_SIZE}>
      <G>
        {ranges.map(s => {
          const isActive = active === s.code
          const r = isActive ? PIE_R * 1.05 : PIE_R
          return (
            <Path
              key={s.code}
              d={slicePath(PIE_CX, PIE_CY, r, PIE_INNER_R, s.startAngle, s.endAngle)}
              fill={s.color}
              opacity={active && !isActive ? 0.3 : 1}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1.5}
              onPress={() => onPress(s.code)}
            />
          )
        })}
      </G>
      {/*näytetään keskellä joko valitun siivun prosentti tai lajien kokonaismäärä*/}
      {activeSlice ? (
        <>
          <SvgText x={PIE_CX} y={PIE_CY - 10} textAnchor="middle" fill="#fff" fontSize={18} fontWeight="700">
            {activeSlice.percentage.toFixed(1)}%
          </SvgText>
          <SvgText x={PIE_CX} y={PIE_CY + 8} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10}>
            {activeSlice.count.toLocaleString()} lajia
          </SvgText>
          <SvgText x={PIE_CX} y={PIE_CY + 22} textAnchor="middle" fill={activeSlice.color} fontSize={11} fontWeight="700">
            {activeSlice.code}
          </SvgText>
        </>
      ) : (
        <>
          <SvgText x={PIE_CX} y={PIE_CY - 5} textAnchor="middle" fill="#fff" fontSize={13} fontWeight="600">
            {total.toLocaleString()}
          </SvgText>
          <SvgText x={PIE_CX} y={PIE_CY + 11} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>
            lajia
          </SvgText>
        </>
      )}
    </Svg>
  )
}

//tilastonäkymä yhteenveto, rengaskaavio ja palkkikaavio kaikista lajeista
function StatsView({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets()
  const map = endangermentMap as Record<string, string>
  const allNames = Object.keys(map)
  const totalSpecies = allNames.length
  const threatened = allNames.filter(n => ['RE','CR','EN','VU'].includes(map[n] ?? '')).length
  const threatenedPct = ((threatened / totalSpecies) * 100).toFixed(1)

  //lasketaan siivut valmiiksi muistiin, koska koko lajilista on suuri
  const globalSlices = React.useMemo(() => buildSlices(allNames), [])
  const [activeGlobal, setActiveGlobal] = React.useState<string | null>(null)

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.content}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Takaisin</Text>
        </Pressable>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <Text style={[styles.title, { marginBottom: 20 }]}>Tilastot</Text>

          {/*yhteenveto kolmessa kortissa*/}
          <View style={statsStyles.summaryRow}>
            <View style={statsStyles.summaryCard}>
              <Text style={statsStyles.summaryValue}>{totalSpecies.toLocaleString()}</Text>
              <Text style={statsStyles.summaryLabel}>Lajia yhteensä</Text>
            </View>
            <View style={[statsStyles.summaryCard, { borderColor: '#cc3300' }]}>
              <Text style={[statsStyles.summaryValue, { color: '#cc3300' }]}>{threatened.toLocaleString()}</Text>
              <Text style={statsStyles.summaryLabel}>Uhanalaista</Text>
            </View>
            <View style={[statsStyles.summaryCard, { borderColor: '#c9a800' }]}>
              <Text style={[statsStyles.summaryValue, { color: '#c9a800' }]}>{threatenedPct}%</Text>
              <Text style={statsStyles.summaryLabel}>Uhanalaisuusaste</Text>
            </View>
          </View>

          {/*donitsikaavio uhanalaisuusjakaumasta*/}
          <View style={statsStyles.section}>
            <Text style={statsStyles.sectionTitle}>Uhanalaisuusjakauma</Text>
            <Text style={statsStyles.sectionSubtitle}>Paina siivua tai luokitusta nähdäksesi tiedot</Text>
            <View style={statsStyles.chartRow}>
              <DonutChart
                slices={globalSlices}
                active={activeGlobal}
                onPress={c => setActiveGlobal(prev => prev === c ? null : c)}
              />
              <View style={statsStyles.legend}>
                {globalSlices.map(s => (
                  <Pressable
                    key={s.code}
                    style={[
                      statsStyles.legendRow,
                      activeGlobal === s.code && statsStyles.legendRowActive,
                      activeGlobal && activeGlobal !== s.code && statsStyles.legendRowDim,
                    ]}
                    onPress={() => setActiveGlobal(prev => prev === s.code ? null : s.code)}
                  >
                    <View style={[statsStyles.legendDot, { backgroundColor: s.color }]} />
                    <Text style={statsStyles.legendCode}>{s.code}</Text>
                    <Text style={statsStyles.legendPct}>{s.percentage.toFixed(0)}%</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* näytetään valitun luokan tiedot tietoruudussa */}
            {activeGlobal && (() => {
              const s = globalSlices.find(x => x.code === activeGlobal)!
              return (
                <View style={[statsStyles.activeBox, { borderColor: s.color }]}>
                  <Text style={[statsStyles.activeCode, { color: s.color }]}>{s.code}</Text>
                  <Text style={statsStyles.activeLabelFi}>{s.labelFi}</Text>
                  <Text style={statsStyles.activeLabelEn}>{ENDANGERMENT_DESCRIPTIONS[s.code]?.en}</Text>
                  <Text style={statsStyles.activeCount}>{s.count.toLocaleString()} lajia · {s.percentage.toFixed(1)}%</Text>
                </View>
              )
            })()}
          </View>

          {/*Vaakapalkkikaavio jossa luokat on eritelty*/}
          <View style={statsStyles.section}>
            <Text style={statsStyles.sectionTitle}>Luokat eriteltynä</Text>
            {globalSlices.map(s => (
              <View key={s.code} style={statsStyles.barRow}>
                <Text style={statsStyles.barCode}>{s.code}</Text>
                <View style={statsStyles.barBg}>
                  <View style={[statsStyles.barFill, { width: `${s.percentage}%` as any, backgroundColor: s.color }]} />
                </View>
                <Text style={statsStyles.barCount}>{s.count.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

const statsStyles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryValue: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, textAlign: 'center' },
  section: {
    backgroundColor: colors.cardDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 14 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legend: { flex: 1, gap: 2 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  legendRowActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  legendRowDim: { opacity: 0.3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendCode: { color: '#ffffff', fontSize: 12, fontWeight: '700', flex: 1 },
  legendPct: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  activeBox: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  activeCode: { fontSize: 22, fontWeight: '800' },
  activeLabelFi: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  activeLabelEn: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  activeCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barCode: { color: '#ffffff', fontSize: 12, fontWeight: '700', width: 28 },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { color: 'rgba(255,255,255,0.5)', fontSize: 11, width: 42, textAlign: 'right' },
})

//lasketaan hakutuloksen osuvuuspisteet — tarkka vastaavuus saa enemmän pisteitä
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

//palautetaan uhanalaisuuskoodin taustaväri- ja tekstiväri merkkiä varten
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

//uhanalaisuusmerkki jota painettaessa avautuu ponnahdusikkuna jossa on koodin selitys
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

//laajennettava osio lajiyksityiskohtanäkymässä — avautuu ja sulkeutuu painettaessa
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
  container: { borderTopWidth: 1, borderTopColor: colors.outline },
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

//päänäkymä — kategoriavalinta, hakukenttä, lajilista ja detaljikortti
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
  const [showStats, setShowStats] = React.useState(false)

  //haetaan lajit valitun kategorian mukaan — ulkomaiset lajit kerätään kaikista kategorioista
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
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL
        const allMvlIds = CATEGORY_DATA.map(c => c.mvlId)
        const results = await Promise.all(
          allMvlIds.map(id =>
            fetch(`${backendUrl}/species/category/${encodeURIComponent(id)}/foreign`)
              .then(r => r.json())
              .catch(() => [])
          )
        )
        //poistetaan duplikaatit ennen lajien tallentamista
        const seen = new Set<string>()
        const combined = results.flat().filter((s: SpeciesItem) => {
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

 //haetaan lajeja hakusanalla ja asetetaan lajitteluksi relevanssi
  const handleSearch = async (text: string) => {
    setSearchText(text)
    setSelectedCategory(null)
    setShowSortMenu(false)
    setSelectedSpecies(null)
    setDetailError('')
    if (!text.trim()) { setSpecies([]); setError(''); return }
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

  //haetaan lajin tarkemmat tiedot tunnuksen perusteella
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

  //tyhjennetään kaikki valinnat ja palauttaa kategorianäkymään
  const clearAll = () => {
    setSelectedCategory(null)
    setSpecies([])
    setError('')
    setShowSortMenu(false)
    setSelectedSpecies(null)
    setDetailError('')
  }

  //tallennetaan lajiteltu lajilista muistiin relevanssin, aakkosjärjestyksen tai uhanalaisuuden mukaan
  const sortedSpecies = React.useMemo(() => [...species].sort((a, b) => {
    const nameA = (a.finnishName || a.scientificName || '').toLowerCase()
    const nameB = (b.finnishName || b.scientificName || '').toLowerCase()
    if (searchText.trim()) {
      const diff = getMatchScore(b, searchText) - getMatchScore(a, searchText)
      if (diff !== 0) return diff
    }
    if (sortMode === 'za') return nameB.localeCompare(nameA, 'fi')
    if (sortMode === 'endangerment') {
      const rankA = ENDANGERMENT_PRIORITY[(endangermentMap as Record<string, string>)[a.scientificName] ?? 'NA'] ?? 0
      const rankB = ENDANGERMENT_PRIORITY[(endangermentMap as Record<string, string>)[b.scientificName] ?? 'NA'] ?? 0
      if (rankA !== rankB) return rankB - rankA
    }
    return nameA.localeCompare(nameB, 'fi')
  }), [species, sortMode, searchText])

  //näytetään kategoriaruudukko kun haku on tyhjä eikä kategoriaa ole valittu
  const showCategories = !searchText.trim() && !selectedCategory

  //vaihdetaan tilastonäkymään
  if (showStats) return <StatsView onBack={() => setShowStats(false)} />

  //näytetään lajiyksityiskohdat tai lataus-/virhetila
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
                  <Image source={{ uri: selectedSpecies.imageUrl }} style={styles.detailHeroImage} resizeMode="cover" />
                )}
                <View style={styles.detailCardBody}>
                  <Text style={styles.detailFinnishName}>{selectedSpecies.finnishName || selectedSpecies.scientificName}</Text>
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

        {/*tilastopainike*/}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <Text style={styles.title}>Species</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Pressable style={styles.statsButton} onPress={() => setShowStats(true)}>
              <Text style={styles.statsButtonText}>📊</Text>
            </Pressable>
          </View>
        </View>

        {/*hakukenttä —kirjoitus käynnistää haun ja nollaa kategoriavalinnan*/}
        <TextInput
          style={styles.searchInput}
          placeholder="Search species by name"
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={handleSearch}
        />

        {/*valitun kategorian merkki*/}
        {!!selectedCategory && (
          <Pressable style={styles.categoryBadge} onPress={clearAll}>
            <Text style={styles.categoryBadgeText}>
              {selectedCategory === FOREIGN_KEY
                ? 'Muut lajit ×'
                : `${CATEGORY_DATA.find(c => c.mvlId === selectedCategory)?.titleFi ?? selectedCategory} ×`}
            </Text>
          </Pressable>
        )}

        {/*lajittelupainike*/}
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

        {/*näytetään joko kategoriaruudukko tai lajilista tilanteen mukaan*/}
        {showCategories ? (
          <FlatList
            data={CATEGORY_DATA}
            keyExtractor={item => item.mvlId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListFooterComponent={
              //ulkomaiset lajit omana korttinaan listan lopussa
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsButton: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statsButtonText: { fontSize: 18 },
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
  categoryBadgeText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sortMenuContainer: { alignSelf: 'flex-end', marginBottom: 12, zIndex: 10 },
  sortButton: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sortDropdown: {
    marginTop: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  sortDropdownItem: { paddingHorizontal: 12, paddingVertical: 10 },
  sortDropdownText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  errorText: { color: '#ffb3b3', marginBottom: 12, textAlign: 'center' },
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
  categoryCardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  categoryCardSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  categoryCardArrow: { color: colors.textSecondary, fontSize: 20 },
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
  speciesCardNames: { flex: 1 },
  speciesCardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  speciesCardScientific: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  speciesCardMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
  badge: {
    alignSelf: 'flex-start',
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
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
  badgePopupEn: { color: '#ffffff', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  badgePopupFi: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 20 },
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
  backButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  detailCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
  },
  detailHeroImage: { width: '100%', height: 220 },
  detailCardBody: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 4 },
  detailFinnishName: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  detailScientificName: { color: colors.textSecondary, fontSize: 15, fontStyle: 'italic', marginBottom: 12 },
  metaSection: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 2 },
  metaLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  metaValue: { color: colors.textPrimary, fontSize: 13, flex: 2, textAlign: 'right' },
})
