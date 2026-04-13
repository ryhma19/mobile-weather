export type SpeciesItem = {
  id: string
  scientificName: string
  finnishName: string
  taxonRank: string
  kingdomScientificName: string
}

export type InfoSection = {
  title: string
  text: string
}

export type SpeciesDetail = {
  id: string
  scientificName: string
  finnishName: string
  taxonRank: string
  kingdomScientificName: string
  informalGroups: string[]
  imageUrl: string
  infoSections: InfoSection[]
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL

export async function searchSpecies(query: string): Promise<SpeciesItem[]> {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return []
  }

  if (!BACKEND_URL) {
    throw new Error('Missing EXPO_PUBLIC_BACKEND_URL')
  }

  const response = await fetch(
    `${BACKEND_URL}/species?q=${encodeURIComponent(trimmedQuery)}`
  )

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}

export async function getSpeciesByCategory(
  category: 'fish' | 'mammals' | 'birds' | 'mushrooms' | 'plants'
): Promise<SpeciesItem[]> {
  if (!BACKEND_URL) {
    throw new Error('Missing EXPO_PUBLIC_BACKEND_URL')
  }

  const response = await fetch(`${BACKEND_URL}/species/category/${category}`)

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}

export async function getSpeciesById(id: string): Promise<SpeciesDetail> {
  if (!BACKEND_URL) {
    throw new Error('Missing EXPO_PUBLIC_BACKEND_URL')
  }

  const response = await fetch(
    `${BACKEND_URL}/species/${encodeURIComponent(id)}`
  )

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}