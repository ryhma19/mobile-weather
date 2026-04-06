import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, Region, UrlTile } from "react-native-maps";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import { colors } from "../theme/colors";
import { INITIAL_REGION, MML_BACKGROUND_TILE_URL } from "../constants/map";

// Overpass API tyypit 
interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassWay {
  type: "way";
  id: number;
  geometry: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

type OverpassElement = OverpassNode | OverpassWay;

// Overpass haku annetun kartta alueen perusteella 
async function queryOverpass(region: Region): Promise<OverpassElement[]> {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
  const s = latitude - latitudeDelta / 2;
  const n = latitude + latitudeDelta / 2;
  const w = longitude - longitudeDelta / 2;
  const e = longitude + longitudeDelta / 2;

  const query =
    `[out:json][timeout:25][maxsize:1048576][bbox:${s},${w},${n},${e}];` +
    `(` +
    `way[highway=path];` +
    `way[highway=footway];` +
    `way[highway=track];` +
    `node[tourism=wilderness_hut];` +
    `node[amenity=shelter][shelter_type=basic_hut];` +
    `node[amenity=shelter][shelter_type=lean_to];` +
    `);` +
    `out geom;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await res.json() as { elements: OverpassElement[] };
  return json.elements;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Overpass-data erillisiin tiloihin
  const [polut, setPolut] = useState<OverpassWay[]>([]);
  const [autiotuvat, setAutiotuvat] = useState<OverpassNode[]>([]);
  const [laavut, setLaavut] = useState<OverpassNode[]>([]);
  const [overpassLoading, setOverpassLoading] = useState(false);
  const [overpassError, setOverpassError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied");
        return;
      }

      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(initial);
      mapRef.current?.animateToRegion(
        {
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500
      );

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (loc) => setUserLocation(loc)
      );
    }

    startTracking();
    return () => { subscription?.remove(); };
  }, []);

  // Hakee Overpass datan annetulle alueelle
  const fetchOverpassData = useCallback(async (region: Region) => {
    // Ei haeta liian suurelle alueelle – yli 0.08° ≈ yli 9 km → liikaa dataa
    if (region.latitudeDelta > 0.08) return;

    setOverpassLoading(true);
    setOverpassError(null);
    try {
      const elements = await queryOverpass(region);
      const newPolut: OverpassWay[] = [];
      const newAutiotuvat: OverpassNode[] = [];
      const newLaavut: OverpassNode[] = [];

      for (const el of elements) {
        if (el.type === "way") {
          newPolut.push(el as OverpassWay);
        } else if (el.type === "node") {
          const tags = el.tags ?? {};
          if (
            tags.tourism === "wilderness_hut" ||
            (tags.amenity === "shelter" && tags.shelter_type === "basic_hut")
          ) {
            newAutiotuvat.push(el as OverpassNode);
          } else if (
            tags.amenity === "shelter" &&
            tags.shelter_type === "lean_to"
          ) {
            newLaavut.push(el as OverpassNode);
          }
        }
      }

      setPolut(newPolut);
      setAutiotuvat(newAutiotuvat);
      setLaavut(newLaavut);
    } catch (err) {
      setOverpassError(err instanceof Error ? err.message : "Overpass-virhe");
    } finally {
      setOverpassLoading(false);
    }
  }, []);

  // Debounsoitu haku alueen vaihtuessa
  const handleRegionChangeComplete = useCallback((region: Region) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchOverpassData(region);
    }, 2500);
  }, [fetchOverpassData]);

  function centerOnUser() {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500
      );
    }
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <View style={styles.topControls}>
          <Pressable style={[styles.controlButton, styles.searchButton]}>
            <Text style={styles.searchButtonText}>Search city</Text>
          </Pressable>

          <Pressable style={styles.locationButton} onPress={centerOnUser}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        <View style={styles.mapCard}>
          {locationError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          )}
          {overpassError && (
            <View style={[styles.errorBanner, styles.overpassErrorBanner]}>
              <Text style={styles.errorText}>Overpass: {overpassError}</Text>
            </View>
          )}
          {overpassLoading && (
            <View style={styles.loadingBadge} pointerEvents="none">
              <ActivityIndicator size="small" color={colors.textPrimary} />
            </View>
          )}
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={INITIAL_REGION}
            mapType={Platform.OS === "android" ? "none" : "standard"}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onRegionChangeComplete={handleRegionChangeComplete}
          >
            {/* MML maastokartta pohjana */}
            <UrlTile
              urlTemplate={MML_BACKGROUND_TILE_URL}
              maximumZ={16}
              flipY={false}
              zIndex={1}
            />

            {/* Polut = ruskea viiva */}
            {polut.map((way) => (
              <Polyline
                key={`way-${way.id}`}
                coordinates={way.geometry.map((p) => ({
                  latitude: p.lat,
                  longitude: p.lon,
                }))}
                strokeColor="#8B4513"
                strokeWidth={2}
                zIndex={2}
              />
            ))}

            {/* Autiotuvat = oranssi merkki */}
            {autiotuvat.map((node) => (
              <Marker
                key={`autio-${node.id}`}
                coordinate={{ latitude: node.lat, longitude: node.lon }}
                title={node.tags?.name ?? "Autiotupa"}
                pinColor="#FF6600"
              />
            ))}

            {/* Laavut = vihreä merkki */}
            {laavut.map((node) => (
              <Marker
                key={`laavu-${node.id}`}
                coordinate={{ latitude: node.lat, longitude: node.lon }}
                title={node.tags?.name ?? "Laavu"}
                pinColor="#2E8B57"
              />
            ))}
          </MapView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 96,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  controlButton: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  searchButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  locationButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  locationButtonText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  mapCard: {
    flex: 1,
    minHeight: 420,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  map: {
    flex: 1,
  },
  errorBanner: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "#b00020",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
  loadingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    padding: 6,
  },
  overpassErrorBanner: {
    top: 54,
    backgroundColor: "#e65100",
  },
  mapOverlayTop: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    alignItems: "flex-start",
  },
  overlayBadge: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  overlayBadgeTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  overlayBadgeText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
