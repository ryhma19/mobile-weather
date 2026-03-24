import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { UrlTile } from "react-native-maps";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { colors } from "../theme/colors";
import { INITIAL_REGION, MML_BACKGROUND_TILE_URL } from "../constants/map";

export default function MapScreen() {
  const insets = useSafeAreaInsets();

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

          <Pressable style={styles.locationButton}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        <View style={styles.mapCard}>
          <MapView
            style={styles.map}
            initialRegion={INITIAL_REGION}
            mapType={Platform.OS === "android" ? "none" : "standard"}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <UrlTile
              urlTemplate={MML_BACKGROUND_TILE_URL}
              maximumZ={16}
              flipY={false}
              zIndex={1}
            />
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
