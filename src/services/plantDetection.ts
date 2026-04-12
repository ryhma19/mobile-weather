import { PLANTNET_API_KEY, PLANTNET_API_URL, PLANTNET_RESULTS_COUNT } from "../constants/plantnet"
import { PlantDetectionResponse, PlantDetectionResult } from "../types/plant"

type PlantNetApiResult = {
  score: number
  species?: {
    scientificName?: string
    commonNames?: string[]
    family?: {
      scientificName?: string
    }
    genus?: {
      scientificName?: string
    }
  }
}

type PlantNetApiResponse = {
  bestMatch?: string
  results?: PlantNetApiResult[]
  remainingIdentificationRequests?: number
}

export async function detectPlantFromImage(imageUri: string): Promise<PlantDetectionResponse> {
  if (!PLANTNET_API_KEY) {
  throw new Error("Missing Pl@ntNet API key")
}

  const formData = new FormData()

  formData.append("images", {
    uri: imageUri,
    name: "plant.jpg",
    type: "image/jpeg",
  } as any)

  formData.append("organs", "auto")

  const url =
    `${PLANTNET_API_URL}?api-key=${PLANTNET_API_KEY}` +
    `&nb-results=${PLANTNET_RESULTS_COUNT}` +
    `&include-related-images=false`

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Plant detection failed")
  }

  const data: PlantNetApiResponse = await response.json()

  const results: PlantDetectionResult[] = (data.results || []).map((item) => {
    return {
      score: item.score || 0,
      scientificName: item.species?.scientificName || "Unknown species",
      commonName: item.species?.commonNames?.[0] || "No common name",
      family: item.species?.family?.scientificName || "Unknown family",
      genus: item.species?.genus?.scientificName || "Unknown genus",
    }
  })

  return {
    bestMatch: data.bestMatch || "Unknown plant",
    results,
    remainingIdentificationRequests: data.remainingIdentificationRequests,
  }
}