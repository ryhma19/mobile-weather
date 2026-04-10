import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { UrlTile } from "react-native-maps";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import { CoordinatesBadge } from "../components/CoordinatesBadge";
import { colors } from "../theme/colors";
import { INITIAL_REGION, MML_BACKGROUND_TILE_URL } from "../constants/map";


export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);


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
      >
        {/* MML maastokartta pohjana */}
        <UrlTile
          urlTemplate={MML_BACKGROUND_TILE_URL}
          maximumZ={16}
          flipY={false}
          zIndex={1}
        />
      </MapView>

      <View style={[styles.topControls, { top: insets.top + 8 }]}>
        <Pressable style={styles.searchButton}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.searchButtonText}>Search city</Text>
        </Pressable>

        <Pressable style={styles.locationButton} onPress={centerOnUser}>
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      {locationError && (
        <View style={[styles.errorBanner, { top: insets.top + 64 }]}>
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
  searchButton: {
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
  searchButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
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
