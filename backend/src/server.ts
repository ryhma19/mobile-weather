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
  scientificNameAuthorship?: string
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

const categoryMap: Record<string, string> = {
  fish: 'MVL.27',
  mammals: 'MVL.2',
  birds: 'MVL.1',
  mushrooms: 'MVL.233',
  plants: 'MVL.343',
}

function mapSpecies(items: LajiItem[]): SpeciesItem[] {
  return items.map((item, index) => ({
    id: item.id || `species-${index}`,
    scientificName: item.scientificName || '',
    // API palauttaa vernacularName tai finnishName kentässä
    finnishName: item.vernacularName || item.finnishName || '',
    taxonRank: item.taxonRank || '',
    kingdomScientificName: item.kingdomScientificName || '',
  }))
}

function mapSpeciesDetail(
  item: LajiItem,
  imageUrl: string,
  infoSections: InfoSection[]
): SpeciesDetail {
  return {
    id: item.id || '',
    scientificName: item.scientificName || '',
    // API palauttaa vernacularName tai finnishName kentässä
    finnishName: item.vernacularName || item.finnishName || '',
    taxonRank: item.taxonRank || '',
    kingdomScientificName: item.kingdomScientificName || '',
    informalGroups: Array.isArray(item.informalGroups)
      ? item.informalGroups
          .map((group) => group.name || '')
          .filter((name) => name.length > 0)
      : [],
    imageUrl,
    infoSections,
  }
}

async function fetchFromLaji(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${LAJI_API_TOKEN}`,
      'API-Version': '1',
      'Accept-Language': 'fi',
    },
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(details)
  }
  return response.json()
}

function getFirstImageUrl(mediaData: any): string {
  const mediaItems = Array.isArray(mediaData?.results)
    ? mediaData.results
    : Array.isArray(mediaData)
      ? mediaData
      : []
  for (const item of mediaItems) {
    if (typeof item?.largeImageURL === 'string' && item.largeImageURL) {
      return item.largeImageURL
    }
    if (typeof item?.thumbnailURL === 'string' && item.thumbnailURL) {
      return item.thumbnailURL
    }
    const imageId =
      item?.id ||
      item?.image?.id ||
      item?.images?.[0]?.id ||
      item?.original?.id ||
      ''
    if (imageId) {
      return `https://api.laji.fi/images/${encodeURIComponent(imageId)}/large.jpg`
    }
  }
  return ''
}

// Poistaa HTML-tagit tekstistä (API palauttaa <p>-tageja sisällössä)
function stripHtml(html: string): string {
  return he.decode(
    html
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  )
}

// Parsii /taxa/{id}/descriptions vastauksen oikeaan muotoon.
// Rakenne: results[].groups[].variables[]{title, content}
// Duplikaatit (sama title) poistetaan
function normalizeDescriptionSections(descriptionData: any): InfoSection[] {
  const results = Array.isArray(descriptionData?.results)
    ? descriptionData.results
    : []

  const sections: InfoSection[] = []
  const seenTitles = new Set<string>()

  for (const result of results) {
    const groups = Array.isArray(result?.groups) ? result.groups : []
    for (const group of groups) {
      const variables = Array.isArray(group?.variables) ? group.variables : []
      for (const variable of variables) {
        const rawTitle = String(variable?.title || '').trim()
        const rawContent = String(variable?.content || '').trim()

        if (!rawContent) continue
        if (variable?.variable === 'MX.speciesCardAuthors') continue

        const title = rawTitle || 'Info'
        const text = stripHtml(rawContent)

        if (!text) continue

        if (seenTitles.has(title)) continue
        seenTitles.add(title)

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
    if (!q) {
      return res.json([])
    }
    if (!LAJI_API_TOKEN) {
      return res.status(500).json({ error: 'Missing LAJI_API_TOKEN in backend/.env' })
    }
    const url = `https://api.laji.fi/taxa/search?query=${encodeURIComponent(q)}&limit=20&includeHidden=false`
    const data = await fetchFromLaji(url)
    const rawItems: LajiItem[] = Array.isArray(data.results) ? data.results : []
    return res.json(mapSpecies(rawItems))
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown server error'
    return res.status(500).json({ error: 'Laji API request failed', details })
  }
})

app.get('/species/category/:category', async (req: Request, res: Response) => {
  try {
    const category = String(req.params.category || '').toLowerCase()
    const informalTaxonGroupId = categoryMap[category]
    if (!LAJI_API_TOKEN) {
      return res.status(500).json({ error: 'Missing LAJI_API_TOKEN in backend/.env' })
    }
    if (!informalTaxonGroupId) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    const url =
      `https://api.laji.fi/taxa/species?` +
      `informalTaxonGroups=${encodeURIComponent(informalTaxonGroupId)}` +
      `&page=1&pageSize=100&includeHidden=false`
    const data = await fetchFromLaji(url)
    const rawItems: LajiItem[] = Array.isArray(data.results) ? data.results : []
    return res.json(mapSpecies(rawItems))
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown server error'
    return res.status(500).json({ error: 'Laji API request failed', details })
  }
})

app.get('/species/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim()
    if (!LAJI_API_TOKEN) {
      return res.status(500).json({ error: 'Missing LAJI_API_TOKEN in backend/.env' })
    }
    if (!id) {
      return res.status(400).json({ error: 'Missing species id' })
    }
    const detailUrl = `https://api.laji.fi/taxa/${encodeURIComponent(id)}`
    const mediaUrl = `https://api.laji.fi/taxa/${encodeURIComponent(id)}/media`
    // checklist=MR.1 hakee virallisen lajikortiston kuvaukset
    const descriptionsUrl = `https://api.laji.fi/taxa/${encodeURIComponent(id)}/descriptions?checklist=MR.1&checklistVersion=current`

    const detailData = await fetchFromLaji(detailUrl)

    let imageUrl = ''
    let infoSections: InfoSection[] = []

    try {
      const mediaData = await fetchFromLaji(mediaUrl)
      imageUrl = getFirstImageUrl(mediaData)
    } catch {
      imageUrl = ''
    }

    try {
      const descriptionsData = await fetchFromLaji(descriptionsUrl)
      infoSections = normalizeDescriptionSections(descriptionsData)
    } catch {
      infoSections = []
    }

    return res.json(mapSpeciesDetail(detailData, imageUrl, infoSections))
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown server error'
    return res.status(500).json({ error: 'Laji API request failed', details })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})