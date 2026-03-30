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
}

type SpeciesItem = {
  id: string
  scientificName: string
  finnishName: string
  taxonRank: string
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

    const url =
      `https://api.laji.fi/taxa/search?` +
      `query=${encodeURIComponent(q)}` +
      `&limit=10` +
      `&includeHidden=false`

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

      return res.status(response.status).json({
        error: 'Laji API request failed',
        details,
      })
    }

    const data = await response.json()
    const rawItems: LajiItem[] = Array.isArray(data.results) ? data.results : []
    const species: SpeciesItem[] = rawItems.map((item, index) => ({
      id: item.id || `species-${index}`,
      scientificName: item.scientificName || '',
      finnishName: item.vernacularName || '',
      taxonRank: item.taxonRank || '',
    }))

    return res.json(species)
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Unknown server error'

    return res.status(500).json({
      error: 'Server error',
      details,
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})