import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

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
  taxonRank?: string
  kingdomScientificName?: string
}

type SpeciesItem = {
  id: string
  scientificName: string
  finnishName: string
  taxonRank: string
  kingdomScientificName: string
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
    finnishName: item.vernacularName || '',
    taxonRank: item.taxonRank || '',
    kingdomScientificName: item.kingdomScientificName || '',
  }))
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
      return res.status(500).json({
        error: 'Missing LAJI_API_TOKEN in backend/.env',
      })
    }

    const url = `https://api.laji.fi/taxa/search?query=${encodeURIComponent(q)}&limit=20&includeHidden=false`
    const data = await fetchFromLaji(url)

    const rawItems: LajiItem[] = Array.isArray(data.results) ? data.results : []

    return res.json(mapSpecies(rawItems))
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Unknown server error'

    return res.status(500).json({
      error: 'Laji API request failed',
      details,
    })
  }
})

app.get('/species/category/:category', async (req: Request, res: Response) => {
  try {
    const category = String(req.params.category || '').toLowerCase()
    const informalTaxonGroupId = categoryMap[category]

    if (!LAJI_API_TOKEN) {
      return res.status(500).json({
        error: 'Missing LAJI_API_TOKEN in backend/.env',
      })
    }

    if (!informalTaxonGroupId) {
      return res.status(400).json({
        error: 'Invalid category',
      })
    }

    const url =
      `https://api.laji.fi/taxa/species?` +
      `informalTaxonGroups=${encodeURIComponent(informalTaxonGroupId)}` +
      `&page=1&pageSize=100&includeHidden=false`

    const data = await fetchFromLaji(url)

    const rawItems: LajiItem[] = Array.isArray(data.results) ? data.results : []

    return res.json(mapSpecies(rawItems))
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Unknown server error'

    return res.status(500).json({
      error: 'Laji API request failed',
      details,
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})