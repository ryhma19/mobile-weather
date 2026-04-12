import React, { useState } from "react"
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system/legacy"
import Ionicons from "@expo/vector-icons/Ionicons"
import { colors } from "../theme/colors"
import { detectPlantFromImage } from "../services/plantDetection"
import { PlantDetectionResult } from "../types/plant"

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`
}

export default function PlantDetectionScreen() {
  const insets = useSafeAreaInsets()

  const [savedImageUri, setSavedImageUri] = useState<string | null>(null)
  const [results, setResults] = useState<PlantDetectionResult[]>([])
  const [bestMatch, setBestMatch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null)

  async function saveImageToApp(uri: string) {
    if (!FileSystem.documentDirectory) {
      throw new Error("Document directory not available")
    }

    const fileName = `plant-${Date.now()}.jpg`
    const destination = `${FileSystem.documentDirectory}${fileName}`

    await FileSystem.copyAsync({
      from: uri,
      to: destination,
    })

    return destination
  }

  async function handleTakePhoto() {
    try {
      setError("")
      setResults([])
      setBestMatch("")
      setRemainingRequests(null)

      const permission = await ImagePicker.requestCameraPermissionsAsync()

      if (!permission.granted) {
        Alert.alert("Camera permission needed", "Please allow camera access.")
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return
      }

      const originalUri = result.assets[0].uri
      const localUri = await saveImageToApp(originalUri)

      setSavedImageUri(localUri)
    } catch (err) {
      setError("Failed to take photo")
    }
  }

  async function handleAnalyzePhoto() {
    if (!savedImageUri) {
      setError("Take a photo first")
      return
    }

    try {
      setLoading(true)
      setError("")
      setResults([])
      setBestMatch("")

      const data = await detectPlantFromImage(savedImageUri)

      setResults(data.results)
      setBestMatch(data.bestMatch)
      setRemainingRequests(
        typeof data.remainingIdentificationRequests === "number"
          ? data.remainingIdentificationRequests
          : null
      )
    } catch (err) {
      setError("Plant detection failed")
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setSavedImageUri(null)
    setResults([])
    setBestMatch("")
    setError("")
    setRemainingRequests(null)
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: 60,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Plant detection</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Take a photo</Text>
        <Text style={styles.cardText}>
          Take a photo of a plant or a berry and analyze it.
        </Text>

        <View style={styles.buttonRow}>
          <Pressable style={styles.primaryButton} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={20} color={colors.background} />
            <Text style={styles.primaryButtonText}>Take photo</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleClear}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved image</Text>

        {savedImageUri ? (
          <Image source={{ uri: savedImageUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.emptyImageBox}>
            <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyImageText}>No image yet</Text>
          </View>
        )}

        <Pressable
          style={[
            styles.primaryButton,
            !savedImageUri || loading ? styles.disabledButton : null,
          ]}
          onPress={handleAnalyzePhoto}
          disabled={!savedImageUri || loading}
        >
          <Ionicons name="leaf-outline" size={20} color={colors.background} />
          <Text style={styles.primaryButtonText}>
            {loading ? "Analyzing..." : "Analyze image"}
          </Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Results</Text>

        {bestMatch ? (
          <View style={styles.bestMatchBox}>
            <Text style={styles.bestMatchLabel}>Best match</Text>
            <Text style={styles.bestMatchText}>{bestMatch}</Text>
          </View>
        ) : null}

        {results.length === 0 && !loading ? (
          <Text style={styles.cardText}>No results yet</Text>
        ) : null}

        {results.map((item, index) => (
          <View key={`${item.scientificName}-${index}`} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>{item.commonName}</Text>
              <Text style={styles.resultScore}>{formatScore(item.score)}</Text>
            </View>

            <Text style={styles.resultScientific}>{item.scientificName}</Text>
            <Text style={styles.resultMeta}>Genus: {item.genus}</Text>
            <Text style={styles.resultMeta}>Family: {item.family}</Text>
          </View>
        ))}

        {remainingRequests !== null ? (
          <Text style={styles.remainingText}>
            Remaining requests today: {remainingRequests}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 16,
  },

  card: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 16,
  },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },

  cardText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
  },

  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.5,
  },

  previewImage: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    marginBottom: 16,
  },

  emptyImageBox: {
    height: 180,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },

  emptyImageText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },

  bestMatchBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },

  bestMatchLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },

  bestMatchText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  resultCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 12,
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },

  resultTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },

  resultScore: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },

  resultScientific: {
    color: colors.textPrimary,
    fontSize: 15,
    fontStyle: "italic",
    marginBottom: 8,
  },

  resultMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },

  errorText: {
    color: "#ffd7d7",
    fontSize: 14,
    marginTop: 12,
  },

  remainingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },

  bottomSpacer: {
    height: 24,
  },
})