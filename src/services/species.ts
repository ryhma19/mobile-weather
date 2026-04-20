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

async function apiFetch(path: string): Promise<Response> {
  if (!BACKEND_URL) throw new Error('Missing EXPO_PUBLIC_BACKEND_URL')
  const response = await fetch(`${BACKEND_URL}${path}`)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response
}

export async function searchSpecies(query: string): Promise<SpeciesItem[]> {
  const q = query.trim()
  if (!q) return []
  return (await apiFetch(`/species?q=${encodeURIComponent(q)}`)).json()
}

export async function getSpeciesByCategory(category: string): Promise<SpeciesItem[]> {
  return (await apiFetch(`/species/category/${encodeURIComponent(category)}`)).json()
}

export async function getSpeciesById(id: string): Promise<SpeciesDetail> {
  return (await apiFetch(`/species/${encodeURIComponent(id)}`)).json()
}