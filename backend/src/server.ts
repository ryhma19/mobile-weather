import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import he from 'he'
dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3001
const LAJI_API_TOKEN = process.env.LAJI_API_TOKEN?.trim()

app.use(cors())
app.use(express.json())

type LajiItem = {
  id?: string
  scientificName?: string
  vernacularName?: string
  finnishName?: string
  taxonRank?: string
  kingdomScientificName?: string
  informalGroups?: Array<{ id?: string; name?: string }>
}

type SpeciesItem = {
  id: string
  scientificName: string
  finnishName: string
  taxonRank: string
  kingdomScientificName: string
}

type InfoSection = {
  title: string
  text: string
}

type SpeciesDetail = {
  id: string
  scientificName: string
  finnishName: string
  taxonRank: string
  kingdomScientificName: string
  informalGroups: string[]
  imageUrl: string
  infoSections: InfoSection[]
}

async function fetchFromLaji(url: string) {
  if (!LAJI_API_TOKEN) throw new Error('Missing LAJI_API_TOKEN in backend/.env')
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${LAJI_API_TOKEN}`,
      'API-Version': '1',
      'Accept-Language': 'fi',
    },
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

async function fetchAllPages(baseUrl: string): Promise<LajiItem[]> {
  const pageSize = 100
  const firstPage = await fetchFromLaji(`${baseUrl}&page=1&pageSize=${pageSize}`)
  const total: number = firstPage.total ?? 0
  const results: LajiItem[] = firstPage.results ?? []
  if (total <= pageSize) return results
  const totalPages = Math.ceil(total / pageSize)
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchFromLaji(`${baseUrl}&page=${i + 2}&pageSize=${pageSize}`)
        .then(d => (d.results ?? []) as LajiItem[])
    )
  )
  return results.concat(...remaining)
}

function mapSpecies(items: LajiItem[]): SpeciesItem[] {
  return items.map((item, i) => ({
    id: item.id || `species-${i}`,
    scientificName: item.scientificName || '',
    finnishName: item.vernacularName || item.finnishName || '',
    taxonRank: item.taxonRank || '',
    kingdomScientificName: item.kingdomScientificName || '',
  }))
}

function getFirstImageUrl(mediaData: any): string {
  const items = Array.isArray(mediaData?.results) ? mediaData.results
    : Array.isArray(mediaData) ? mediaData : []
  for (const item of items) {
    if (item?.largeImageURL) return item.largeImageURL
    if (item?.squareURL) return item.squareURL
    if (item?.thumbnailURL) return item.thumbnailURL
    const imageId = item?.id || item?.image?.id || item?.images?.[0]?.id || item?.original?.id
    if (imageId) return `https://api.laji.fi/images/${encodeURIComponent(imageId)}/original.jpg`
  }
  return ''
}

function stripHtml(html: string): string {
  return he.decode(
    html
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  )
}

function parseDescriptions(data: any): InfoSection[] {
  const sections: InfoSection[] = []
  const seen = new Set<string>()
  for (const result of data?.results ?? []) {
    for (const group of result?.groups ?? []) {
      for (const v of group?.variables ?? []) {
        if (v?.variable === 'MX.speciesCardAuthors') continue
        const title = String(v?.title || '').trim() || 'Info'
        const text = stripHtml(String(v?.content || '').trim())
        if (!text || seen.has(title)) continue
        seen.add(title)
        sections.push({ title, text })
      }
    }
  }
  return sections
}

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Server is running' })
})

app.get('/species', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json([])
    const data = await fetchFromLaji(
      `https://api.laji.fi/taxa/search?query=${encodeURIComponent(q)}&limit=20&includeHidden=false`
    )
    res.json(mapSpecies(data.results ?? []))
  } catch (e) {
    res.status(500).json({ error: 'Laji API request failed', details: String(e) })
  }
})

//Muut lajit
app.get('/species/category/:category/foreign', async (req: Request, res: Response) => {
  try {
    const category = String(req.params.category || '').trim()
    if (!category) return res.status(400).json({ error: 'Missing category' })
    const [all, finnish] = await Promise.all([
      fetchAllPages(`https://api.laji.fi/taxa/species?informalTaxonGroups=${encodeURIComponent(category)}&includeHidden=false`),
      fetchAllPages(`https://api.laji.fi/taxa/species?informalTaxonGroups=${encodeURIComponent(category)}&finnish=true&includeHidden=false`),
    ])
    const finnishIds = new Set(finnish.map(i => i.id))
    const foreign = all.filter(i => !finnishIds.has(i.id))
    res.json(mapSpecies(foreign))
  } catch (e) {
    res.status(500).json({ error: 'Laji API request failed', details: String(e) })
  }
})

//Suomessa esiintyvät lajit
app.get('/species/category/:category', async (req: Request, res: Response) => {
  try {
    const category = String(req.params.category || '').trim()
    if (!category) return res.status(400).json({ error: 'Missing category' })
    const items = await fetchAllPages(
      `https://api.laji.fi/taxa/species?informalTaxonGroups=${encodeURIComponent(category)}&finnish=true&includeHidden=false`
    )
    res.json(mapSpecies(items))
  } catch (e) {
    res.status(500).json({ error: 'Laji API request failed', details: String(e) })
  }
})

app.get('/species/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).json({ error: 'Missing species id' })

    const [detail, mediaData, descriptionsData] = await Promise.allSettled([
      fetchFromLaji(`https://api.laji.fi/taxa/${encodeURIComponent(id)}`),
      fetchFromLaji(`https://api.laji.fi/taxa/${encodeURIComponent(id)}/media`),
      fetchFromLaji(`https://api.laji.fi/taxa/${encodeURIComponent(id)}/descriptions?checklist=MR.1&checklistVersion=current`),
    ])

    if (detail.status === 'rejected') throw new Error(detail.reason)
    const item: LajiItem = detail.value

    res.json({
      id: item.id || '',
      scientificName: item.scientificName || '',
      finnishName: item.vernacularName || item.finnishName || '',
      taxonRank: item.taxonRank || '',
      kingdomScientificName: item.kingdomScientificName || '',
      informalGroups: Array.isArray(item.informalGroups)
        ? item.informalGroups.map(g => g.name || '').filter(Boolean)
        : [],
      imageUrl: mediaData.status === 'fulfilled' ? getFirstImageUrl(mediaData.value) : '',
      infoSections: descriptionsData.status === 'fulfilled' ? parseDescriptions(descriptionsData.value) : [],
    } satisfies SpeciesDetail)
  } catch (e) {
    res.status(500).json({ error: 'Laji API request failed', details: String(e) })
  }
})

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))
