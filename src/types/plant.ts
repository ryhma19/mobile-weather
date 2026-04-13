export type PlantDetectionResult = {
  score: number
  scientificName: string
  commonName: string
  family: string
  genus: string
}

export type PlantDetectionResponse = {
  bestMatch: string
  results: PlantDetectionResult[]
  remainingIdentificationRequests?: number
}