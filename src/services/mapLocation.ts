import * as Location from "expo-location";
import type { MapViewport } from "./mapHuts";

export function createRegion(
  latitude: number,
  longitude: number,
  latitudeDelta = 0.05,
  longitudeDelta = 0.05
): MapViewport {
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

export async function searchLocationRegion(
  query: string
): Promise<MapViewport | null> {
  const results = await Location.geocodeAsync(query);

  if (!results.length) {
    return null;
  }

  const firstResult = results[0];

  return createRegion(firstResult.latitude, firstResult.longitude, 0.08, 0.08);
}
