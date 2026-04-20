import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

export type HutRegion = "lappi";

export type WildernessHut = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  details: string | undefined;
};

export type MapViewport = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type CategoryCount = {
  category: string;
  count: number;
};

const LAPPI_GPX = require("../../assets/lappi-autiotuvat.gpx");
const MAX_VISIBLE_HUTS = 120;

export const LAPPI_REGION: MapViewport = {
  latitude: 68.2,
  longitude: 26.8,
  latitudeDelta: 3.8,
  longitudeDelta: 4.6,
};

export const HUTS_VISIBLE_MAX_LATITUDE_DELTA = 0.95;

function parseGpxWaypoints(gpx: string): WildernessHut[] {
  const matches = [...gpx.matchAll(/<wpt\b([^>]*)>([\s\S]*?)<\/wpt>/gi)];

  return matches
    .map((match, index) => {
      const attributes = match[1];
      const content = match[2];
      const latMatch = attributes.match(/lat="([^"]+)"/i);
      const lonMatch = attributes.match(/lon="([^"]+)"/i);
      const latitude = Number(latMatch?.[1]);
      const longitude = Number(lonMatch?.[1]);
      const nameMatch = content.match(/<name>([\s\S]*?)<\/name>/i);
      const symMatch = content.match(/<sym>([\s\S]*?)<\/sym>/i);
      const detailMatch = content.match(/<(?:cmt|desc)>([\s\S]*?)<\/(?:cmt|desc)>/i);
      const name = nameMatch?.[1]?.trim() || `Autiotupa ${index + 1}`;
      const category = symMatch?.[1]?.trim() || detailMatch?.[1]?.trim() || "Other";
      const details = detailMatch?.[1]?.trim();

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null;
      }

      return {
        id: `${name}-${latitude}-${longitude}`,
        name,
        latitude,
        longitude,
        category,
        details,
      };
    })
    .filter((hut): hut is WildernessHut => hut !== null);
}

export async function loadRegionHuts(region: HutRegion): Promise<WildernessHut[]> {
  if (region !== "lappi") {
    return [];
  }

  const asset = Asset.fromModule(LAPPI_GPX);

  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const uri = asset.localUri ?? asset.uri;
  const gpxContent = await FileSystem.readAsStringAsync(uri);
  const huts = parseGpxWaypoints(gpxContent);

  if (!huts.length) {
    throw new Error("No huts parsed from GPX");
  }

  return huts;
}

export function getAvailableCategories(huts: WildernessHut[]): string[] {
  return Array.from(new Set(huts.map((hut) => hut.category))).sort();
}

export function getCategoryCounts(huts: WildernessHut[]): CategoryCount[] {
  return getAvailableCategories(huts).map((category) => ({
    category,
    count: huts.filter((hut) => hut.category === category).length,
  }));
}

export function getVisibleHuts(
  huts: WildernessHut[],
  selectedCategories: string[],
  currentRegion: MapViewport
): WildernessHut[] {
  if (currentRegion.latitudeDelta > HUTS_VISIBLE_MAX_LATITUDE_DELTA) {
    return [];
  }

  const activeCategories = selectedCategories.length
    ? selectedCategories
    : getAvailableCategories(huts);

  return huts
    .filter((hut) => activeCategories.includes(hut.category))
    .slice(0, MAX_VISIBLE_HUTS);
}
