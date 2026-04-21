import React, { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
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
import AsyncStorage from "@react-native-async-storage/async-storage"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { auth } from "../services/firebase"
import { logoutUser } from "../services/auth"
import {
  deleteSighting,
  subscribeToSightings,
  type Sighting,
} from "../services/sightings"
import { colors } from "../theme/colors"

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const user = auth.currentUser
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [allSightings, setAllSightings] = useState<Sighting[]>([])
  const [currentPage, setCurrentPage] = useState<"profile" | "mySightings">("profile")
  const [deletingSightingId, setDeletingSightingId] = useState<string | null>(null)

  const mySightings = useMemo(() => {
    if (!user) {
      return []
    }

    return allSightings.filter((item) => item.userId === user.uid)
  }, [allSightings, user])

  async function handleLogout() {
    try {
      await logoutUser()
    } catch (error: any) {
      Alert.alert("Logout failed", error.message || "Could not log out")
    }
  }

  useEffect(() => {
    loadProfileImage()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToSightings((items) => {
      setAllSightings(items)
    })

    return unsubscribe
  }, [])

  async function loadProfileImage() {
    const saved = await AsyncStorage.getItem("profileImage")
    if (saved) {
      setImageUri(saved)
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })

    if (!result.canceled) {
      const uri = result.assets[0].uri
      setImageUri(uri)
      await AsyncStorage.setItem("profileImage", uri)
    }
  }

  function confirmDeleteSighting(item: Sighting) {
    if (deletingSightingId) {
      return
    }

    Alert.alert(
      "Delete sighting",
      `Delete \"${item.category}\"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteSighting(item.id),
        },
      ]
    )
  }

  async function handleDeleteSighting(sightingId: string) {
    try {
      setDeletingSightingId(sightingId)
      await deleteSighting(sightingId)
    } catch (error: any) {
      Alert.alert("Delete failed", error.message || "Could not delete sighting")
    } finally {
      setDeletingSightingId(null)
    }
  }

  if (currentPage === "mySightings") {
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
        <Pressable style={styles.backButton} onPress={() => setCurrentPage("profile")}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={colors.textPrimary}
          />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Text style={styles.screenTitle}>My sightings</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your sightings</Text>
          <Text style={styles.cardText}>
            {mySightings.length} {mySightings.length === 1 ? "sighting" : "sightings"}
          </Text>
        </View>

        {mySightings.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No sightings yet</Text>
            <Text style={styles.cardText}>You have not added any sightings yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sightings list</Text>

            <View style={styles.sightingsList}>
              {mySightings.map((item, index) => {
                const isDeleting = deletingSightingId === item.id

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.sightingItem,
                      index === mySightings.length - 1 && styles.sightingItemLast,
                    ]}
                  >
                    <View style={styles.sightingTopRow}>
                      <View style={styles.sightingTextContent}>
                        <View style={styles.sightingHeader}>
                          <Text style={styles.sightingCategory}>{item.category}</Text>
                          <MaterialCommunityIcons
                            name="map-marker"
                            size={18}
                            color={colors.accent}
                          />
                        </View>

                        {item.note ? (
                          <Text style={styles.sightingNote}>{item.note}</Text>
                        ) : (
                          <Text style={styles.sightingEmptyNote}>No extra info</Text>
                        )}

                        <Text style={styles.sightingCoords}>
                          {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                        </Text>
                      </View>

                      <Pressable
                        style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                        onPress={() => confirmDeleteSighting(item)}
                        disabled={isDeleting || deletingSightingId !== null}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={colors.textPrimary} />
                        ) : (
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={18}
                            color={colors.textPrimary}
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    )
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
      <Text style={styles.screenTitle}>Profile</Text>

      <View style={styles.profileImageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profilePlaceholderText}>No image</Text>
          </View>
        )}

        <Pressable style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.imageButtonText}>Change picture</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardText}>{user?.email || "No user email"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>User ID</Text>
        <Text style={styles.cardText}>{user?.uid || "No user id"}</Text>
      </View>

      <Pressable style={styles.card} onPress={() => setCurrentPage("mySightings")}>
        <View style={styles.sectionButtonRow}>
          <View>
            <Text style={styles.cardTitle}>My sightings</Text>
            <Text style={styles.cardText}>Open your sightings page</Text>
          </View>

          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.textPrimary}
          />
        </View>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </Pressable>

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
    backgroundColor: colors.cardDark,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 12,
    justifyContent: "center",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
  bottomSpacer: {
    height: 24,
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  profilePlaceholderText: {
    color: colors.textSecondary,
  },
  imageButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  imageButtonText: {
    color: colors.background,
    fontWeight: "600",
  },
  sectionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    minHeight: 42,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  sightingsList: {
    marginTop: 6,
  },
  sightingItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  sightingItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  sightingTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  sightingTextContent: {
    flex: 1,
  },
  sightingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sightingCategory: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
  },
  sightingNote: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  sightingEmptyNote: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  sightingCoords: {
    color: colors.textMuted,
    fontSize: 13,
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
})
