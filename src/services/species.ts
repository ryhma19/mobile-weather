export type SpeciesItem = {
    id: string
    scientificName: string
    finnishName: string
    taxonRank: string
    kingdomScientificName: string
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