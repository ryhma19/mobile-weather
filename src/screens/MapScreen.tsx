import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, UrlTile } from "react-native-maps";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import { CoordinatesBadge } from "../components/CoordinatesBadge";
import { INITIAL_REGION, MML_BACKGROUND_TILE_URL } from "../constants/map";
import {
  getAvailableCategories,
  getCategoryCounts,
  getVisibleHuts,
  HUTS_VISIBLE_MAX_LATITUDE_DELTA,
  LAPPI_REGION,
  loadRegionHuts,
  type HutRegion,
  type MapViewport,
  type WildernessHut,
} from "../services/mapHuts";
import { createRegion, searchLocationRegion } from "../services/mapLocation";
import { colors } from "../theme/colors";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showHutsPanel, setShowHutsPanel] = useState(false);
  const [isLoadingHuts, setIsLoadingHuts] = useState(false);
  const [selectedHutRegion, setSelectedHutRegion] = useState<HutRegion | null>(null);
  const [wildernessHuts, setWildernessHuts] = useState<WildernessHut[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentRegion, setCurrentRegion] = useState<MapViewport>(INITIAL_REGION);

  const availableCategories = useMemo(
    () => getAvailableCategories(wildernessHuts),
    [wildernessHuts]
  );

  const categoryCounts = useMemo(
    () => getCategoryCounts(wildernessHuts),
    [wildernessHuts]
  );

  const isZoomedInEnough = currentRegion.latitudeDelta <= HUTS_VISIBLE_MAX_LATITUDE_DELTA;

  const visibleHuts = useMemo(
    () => getVisibleHuts(wildernessHuts, selectedCategories, currentRegion),
    [currentRegion, selectedCategories, wildernessHuts]
  );

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
      const nextRegion = createRegion(
        initial.coords.latitude,
        initial.coords.longitude
      );
      setCurrentRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (loc) => setUserLocation(loc)
      );
    }

    startTracking();
    return () => {
      subscription?.remove();
    };
  }, []);

  function centerOnUser() {
    if (userLocation) {
      setLocationError(null);
      const nextRegion = createRegion(
        userLocation.coords.latitude,
        userLocation.coords.longitude
      );
      setCurrentRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    }
  }

  async function searchPlace() {
    const query = searchQuery.trim();

    if (!query || isSearching) {
      return;
    }

    Keyboard.dismiss();
    setLocationError(null);
    setIsSearching(true);

    try {
      const nextRegion = await searchLocationRegion(query);

      if (!nextRegion) {
        setLocationError(`No places found for "${query}"`);
        return;
      }
      setCurrentRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    } catch {
      setLocationError("Place search failed. Try a different name.");
    } finally {
      setIsSearching(false);
    }
  }

  function toggleCategorySelection(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  async function toggleLappiHuts() {
    if (selectedHutRegion === "lappi") {
      setSelectedHutRegion(null);
      setWildernessHuts([]);
      setSelectedCategories([]);
      return;
    }

    setLocationError(null);
    setIsLoadingHuts(true);

    try {
      const parsedHuts = await loadRegionHuts("lappi");
      const categories = getAvailableCategories(parsedHuts);

      setWildernessHuts(parsedHuts);
      setSelectedHutRegion("lappi");
      setSelectedCategories(categories);
      setCurrentRegion(LAPPI_REGION);
      mapRef.current?.animateToRegion(LAPPI_REGION, 700);
    } catch {
      setSelectedHutRegion(null);
      setWildernessHuts([]);
      setSelectedCategories([]);
      setLocationError("Autiotupien lataus epäonnistui.");
    } finally {
      setIsLoadingHuts(false);
    }
  }

  return (
    <View style={styles.container}>
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
        onRegionChangeComplete={(region) => setCurrentRegion(region)}
      >
        <UrlTile
          urlTemplate={MML_BACKGROUND_TILE_URL}
          maximumZ={16}
          flipY={false}
          zIndex={1}
        />

        {visibleHuts.map((hut) => (
          <Marker
            key={hut.id}
            coordinate={{ latitude: hut.latitude, longitude: hut.longitude }}
            title={hut.name}
            description={hut.details ?? hut.category}
          >
            <View style={styles.hutMarker}>
              <MaterialCommunityIcons
                name="home-variant"
                size={14}
                color={colors.textPrimary}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.topControls, { top: insets.top + 8 }]}> 
        <View style={styles.searchBox}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={colors.textSecondary}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchPlace}
            placeholder="Search place"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          <Pressable
            style={styles.searchActionButton}
            onPress={searchPlace}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <MaterialCommunityIcons
                name="arrow-right"
                size={18}
                color={colors.textPrimary}
              />
            )}
          </Pressable>
        </View>

        <Pressable
          style={styles.hutsToggleButton}
          onPress={() => setShowHutsPanel((current) => !current)}
        >
          <MaterialCommunityIcons
            name="home-group"
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>

        <Pressable style={styles.locationButton} onPress={centerOnUser}>
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      {showHutsPanel && (
        <View style={[styles.hutsPanel, { top: insets.top + 62 }]}>
          <Text style={styles.hutsPanelTitle}>Show the huts</Text>
          <Pressable
            style={[
              styles.regionOption,
              selectedHutRegion === "lappi" && styles.regionOptionActive,
            ]}
            onPress={toggleLappiHuts}
            disabled={isLoadingHuts}
          >
            {isLoadingHuts ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={16}
                color={colors.textPrimary}
              />
            )}
            <Text style={styles.regionOptionText}>Lappi</Text>
          </Pressable>

          {selectedHutRegion === "lappi" && categoryCounts.length > 0 && (
            <>
              <Text style={styles.filterLabel}>Choose categories</Text>
              <View style={styles.categoryWrap}>
                {categoryCounts.map(({ category, count }) => {
                  const isSelected = selectedCategories.includes(category);

                  return (
                    <Pressable
                      key={category}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipActive,
                      ]}
                      onPress={() => toggleCategorySelection(category)}
                    >
                      <Text style={styles.categoryChipText}>
                        {category} ({count})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterHint}>
                {!isZoomedInEnough
                  ? "Zoom closer to see huts on the map"
                  : `${visibleHuts.length} huts visible`}
              </Text>
            </>
          )}
        </View>
      )}

      {locationError && (
        <View
          style={[
            styles.errorBanner,
            { top: insets.top + (showHutsPanel ? 138 : 64) },
          ]}
        >
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      <CoordinatesBadge
        latitude={userLocation?.coords.latitude}
        longitude={userLocation?.coords.longitude}
        topOffset={insets.top + 60}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topControls: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(10, 22, 48, 0.30)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchActionButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  hutsToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 22, 48, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 22, 48, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  hutsPanel: {
    position: "absolute",
    left: 12,
    right: 64,
    zIndex: 19,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(10, 22, 48, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 10,
  },
  hutsPanelTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  regionOption: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
  },
  regionOptionActive: {
    backgroundColor: "rgba(199, 215, 246, 0.22)",
  },
  regionOptionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  categoryChipActive: {
    backgroundColor: "rgba(199, 215, 246, 0.22)",
    borderColor: "rgba(199, 215, 246, 0.36)",
  },
  categoryChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  filterHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  hutMarker: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(23, 57, 109, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  errorBanner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 18,
    backgroundColor: "#b00020",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
});
