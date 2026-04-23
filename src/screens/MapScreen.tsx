import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, UrlTile } from "react-native-maps";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";
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
import { createSighting, subscribeToSightings, type Sighting } from "../services/sightings";
import { colors } from "../theme/colors";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // --- Sijaintitilamuuttujat ---
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // --- Hakukenttä ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // --- Autiotupapaneeli ---
  const [showHutsPanel, setShowHutsPanel] = useState(false);
  const [isLoadingHuts, setIsLoadingHuts] = useState(false);
  const [selectedHutRegion, setSelectedHutRegion] = useState<HutRegion | null>(null);
  const [wildernessHuts, setWildernessHuts] = useState<WildernessHut[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // --- Kartan näkymäalue ---
  const [currentRegion, setCurrentRegion] = useState<MapViewport>(INITIAL_REGION);

  // --- Havainnot (sightings) ---
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isPickingSightingLocation, setIsPickingSightingLocation] = useState(false);
  const [draftCoordinate, setDraftCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [sightingCategory, setSightingCategory] = useState("");
  const [sightingNote, setSightingNote] = useState("");
  const [isSavingSighting, setIsSavingSighting] = useState(false);

  // --- Askelmittari ---
  const [stepCount, setStepCount] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [isStepTracking, setIsStepTracking] = useState(true);
  const [showPedometerModal, setShowPedometerModal] = useState(false);

  const navigation = useNavigation<any>();

  // Lasketaan saatavilla olevat kategoriat muistiin (suorituskyky)
  const availableCategories = useMemo(
    () => getAvailableCategories(wildernessHuts),
    [wildernessHuts]
  );

  // Lasketaan kategoriamäärät suodatinchipejä varten
  const categoryCounts = useMemo(
    () => getCategoryCounts(wildernessHuts),
    [wildernessHuts]
  );

  // Onko kartta zoomattu tarpeeksi lähelle tupien näyttämistä varten
  const isZoomedInEnough = currentRegion.latitudeDelta <= HUTS_VISIBLE_MAX_LATITUDE_DELTA;

  // Näytettävät tuvat suodatettuina kategorian ja näkymäalueen mukaan
  const visibleHuts = useMemo(
    () => getVisibleHuts(wildernessHuts, selectedCategories, currentRegion),
    [currentRegion, selectedCategories, wildernessHuts]
  );

  // Välitetään navigaatiolle tieto, onko havainnon lisäys käynnissä
  useEffect(() => {
    navigation.setParams({ isAddingSighting: isPickingSightingLocation });
  }, [isPickingSightingLocation, navigation]);

  // Seurataan näppäimistön korkeutta, jotta paneeli nousee sen mukana
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Tarkistetaan tukeeko laite askelmittaria
  useEffect(() => {
    Pedometer.isAvailableAsync().then(setIsPedometerAvailable);
  }, []);

  // Tilataan askeleet kun mittari on saatavilla ja seuranta on päällä.
  // watchStepCount palauttaa kumulatiivisen summan tilauksen alusta.
  useEffect(() => {
    let pedometerSub: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    if (isPedometerAvailable && isStepTracking) {
      pedometerSub = Pedometer.watchStepCount((result) => {
        setStepCount(result.steps);
      });
    }
    return () => {
      pedometerSub?.remove();
    };
  }, [isPedometerAvailable, isStepTracking]);

  // Käynnistetään GPS-seuranta ja päivitetään sijainti jatkuvasti
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

  // Tilataan havainnot Firestoresta reaaliajassa
  useEffect(() => {
    const unsubscribe = subscribeToSightings((items) => {
      setSightings(items);
    });

    return unsubscribe;
  }, []);

  // Keskitetään kartta käyttäjän sijaintiin
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

  // Haetaan paikka nimellä ja siirrytään siihen kartalla
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

  // Vaihdetaan kategorian valinta päälle/pois suodatinta varten
  function toggleCategorySelection(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  // Ladataan tai piilotetaan Lapin autiotuvat
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

  // Aloitetaan uuden havainnon lisäys — käyttäjä valitsee sijainnin kartalta
  function startPickingSightingLocation() {
    setLocationError(null);
    setShowHutsPanel(false);
    setIsPickingSightingLocation(true);
    setDraftCoordinate(null);
    setSightingCategory("");
    setSightingNote("");
  }

  // Peruutetaan keskeneräinen havainto ja tyhjennetään lomake
  function cancelSightingDraft() {
    Keyboard.dismiss();
    setIsPickingSightingLocation(false);
    setDraftCoordinate(null);
    setSightingCategory("");
    setSightingNote("");
    setIsSavingSighting(false);
  }

  // Käsitellään kartan painallus — asetetaan havainnon sijaintikoordinaatit
  function handleMapPress(event: any) {
    Keyboard.dismiss();

    if (!isPickingSightingLocation) {
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    setDraftCoordinate({ latitude, longitude });
  }

  // Tallennetaan havainto Firestoreen validoinnin jälkeen
  async function saveSighting() {
  const trimmedCategory = sightingCategory.trim()
  const trimmedNote = sightingNote.trim()

  if (!draftCoordinate) {
    setLocationError("Pick a location on the map first")
    return
  }

  if (!trimmedCategory) {
    setLocationError("Add a category first")
    return
  }

  try {
    setLocationError(null)
    setIsSavingSighting(true)

    console.log("saveSighting start")

    await createSighting(
      trimmedCategory,
      trimmedNote,
      draftCoordinate.latitude,
      draftCoordinate.longitude
    )

    console.log("saveSighting success")
    cancelSightingDraft()
  } catch (error: any) {
    console.log("saveSighting failed", error)
    setLocationError(error?.message || "Failed to save sighting")
  } finally {
    setIsSavingSighting(false)
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
          onPress={handleMapPress}
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

          {sightings.map((item) => (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              title={item.category}
              description={item.note}
              pinColor={colors.accent}
            />
          ))}

          {draftCoordinate && (
            <Marker
              coordinate={draftCoordinate}
              title="New sighting"
              description="Draft location"
              pinColor="green"
            />
          )}
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

        {!isPickingSightingLocation && (
          <Pressable
            style={[styles.addButton, { bottom: insets.bottom + 79 }]}
            onPress={startPickingSightingLocation}
           >
             <MaterialCommunityIcons
                name="plus"
                size={22}
                color={colors.textPrimary}
              />
             <Text style={styles.addButtonText}>Add sighting</Text>
          </Pressable>
        )}

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
        {isPickingSightingLocation && (
        <View
           style={[
            styles.sightingPanel,
            { bottom: keyboardHeight > 0 ? keyboardHeight + 12 : 12 },
  ]}
>
            <View style={styles.sightingPanelHeader}>
              <Text style={styles.sightingTitle}>New sighting</Text>
              <Pressable onPress={Keyboard.dismiss} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>

            <Text style={styles.sightingHelp}>
              Tap the map to choose a location
            </Text>

            <TextInput
              value={sightingCategory}
              onChangeText={setSightingCategory}
              placeholder="Category, example blueberries"
              placeholderTextColor={colors.textMuted}
              style={styles.sightingInput}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <TextInput
              value={sightingNote}
              onChangeText={setSightingNote}
              placeholder="Extra info"
              placeholderTextColor={colors.textMuted}
              style={[styles.sightingInput, styles.sightingNoteInput]}
              multiline
            />

            <View style={styles.sightingActions}>
              <Pressable
                style={[styles.sightingActionButton, styles.cancelButton]}
                onPress={cancelSightingDraft}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.sightingActionButton, styles.saveButton]}
                onPress={saveSighting}
                disabled={isSavingSighting}
              >
                {isSavingSighting ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
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

      {isPedometerAvailable && (
        <Pressable
          style={[styles.pedometerBadge, { bottom: insets.bottom + 24 }]}
          onPress={() => setShowPedometerModal(true)}
        >
          <MaterialCommunityIcons
            name="shoe-print"
            size={16}
            color={isStepTracking ? colors.textPrimary : colors.textMuted}
          />
          <Text style={styles.pedometerText}>{stepCount} askelta</Text>
          <MaterialCommunityIcons
            name={isStepTracking ? "pause" : "play"}
            size={14}
            color={colors.textMuted}
          />
        </Pressable>
      )}

      <Modal
        visible={showPedometerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPedometerModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowPedometerModal(false)}
        >
          <View style={[styles.pedometerModal, { bottom: insets.bottom + 88 }]}>
            <Text style={styles.pedometerModalTitle}>Askelmittari</Text>
            <Text style={styles.pedometerModalCount}>{stepCount}</Text>
            <Text style={styles.pedometerModalLabel}>askelta</Text>
            <View style={styles.pedometerModalActions}>
              <Pressable
                style={styles.pedometerAction}
                onPress={() => {
                  setIsStepTracking((t) => !t);
                  setShowPedometerModal(false);
                }}
              >
                <MaterialCommunityIcons
                  name={isStepTracking ? "pause-circle-outline" : "play-circle-outline"}
                  size={28}
                  color={colors.textPrimary}
                />
                <Text style={styles.pedometerActionLabel}>
                  {isStepTracking ? "Tauko" : "Jatka"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.pedometerAction}
                onPress={() => {
                  setStepCount(0);
                  setShowPedometerModal(false);
                }}
              >
                <MaterialCommunityIcons name="refresh-circle" size={28} color={colors.textPrimary} />
                <Text style={styles.pedometerActionLabel}>Nollaa</Text>
              </Pressable>
              <Pressable
                style={styles.pedometerAction}
                onPress={() => setShowPedometerModal(false)}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={28} color={colors.textMuted} />
                <Text style={[styles.pedometerActionLabel, { color: colors.textMuted }]}>Sulje</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  addButton: {
    position: "absolute",
    right: 12,
    zIndex: 20,
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(10, 22, 48, 0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  addButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
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
  sightingPanel: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 22,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(10, 22, 48, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sightingPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sightingTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  doneButton: {
    minHeight: 30,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  doneButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  sightingHelp: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  sightingInput: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
  },
  sightingNoteInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  sightingActions: {
    flexDirection: "row",
    gap: 10,
  },
  sightingActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "700",
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
  pedometerBadge: {
    position: "absolute",
    alignSelf: "center",
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(10, 22, 48, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 20,
  },
  pedometerText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingLeft: 12,
  },
  pedometerModal: {
    position: "absolute",
    left: 12,
    width: 200,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    backgroundColor: "rgba(10, 22, 48, 0.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 4,
    zIndex: 30,
  },
  pedometerModalTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pedometerModalCount: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 56,
  },
  pedometerModalLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  pedometerModalActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  pedometerAction: {
    alignItems: "center",
    gap: 4,
  },
  pedometerActionLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "600",
  },
});