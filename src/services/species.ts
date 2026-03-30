export type SpeciesItem = {
    id: string
    scientificName: string
    finnishName: string
    taxonRank: string
  }
  
  const BACKEND_URL = 'http://192.168.0.100:3001'
  
  export async function searchSpecies(query: string): Promise<SpeciesItem[]> {
    const trimmedQuery = query.trim()
  
    if (!trimmedQuery) {
      return []
    }
    const response = await fetch(
      `${BACKEND_URL}/species?q=${encodeURIComponent(trimmedQuery)}`
    )
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }
    return response.json()
  }