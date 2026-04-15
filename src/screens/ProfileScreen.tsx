import React from "react"
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { auth } from "../services/firebase"
import { logoutUser } from "../services/auth"
import { colors } from "../theme/colors"
import * as ImagePicker from "expo-image-picker"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Image } from "react-native"
import { useEffect, useState } from "react"

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const user = auth.currentUser
  const [imageUri, setImageUri] = useState<string | null>(null)

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
        <Text style={styles.cardText}>
          {user?.email || "No user email"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>User ID</Text>
        <Text style={styles.cardText}>
          {user?.uid || "No user id"}
        </Text>
      </View>

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
})