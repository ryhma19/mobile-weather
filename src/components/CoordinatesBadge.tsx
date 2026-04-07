import React from "react";
import { StyleSheet, Text, View } from "react-native";

type CoordinatesBadgeProps = {
  latitude?: number;
  longitude?: number;
  topOffset?: number;
};

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function CoordinatesBadge({ latitude, longitude, topOffset = 4 }: CoordinatesBadgeProps) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.container, { top: topOffset }] }>
      <Text>
        {formatCoordinate(latitude)}, {formatCoordinate(longitude)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 12,
  },
});
