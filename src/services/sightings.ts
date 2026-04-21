import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore"
import { auth, db } from "./firebase"

export type Sighting = {
  id: string
  userId: string
  category: string
  note: string
  latitude: number
  longitude: number
}

export async function createSighting(
  category: string,
  note: string,
  latitude: number,
  longitude: number
) {
  const user = auth.currentUser

  console.log("createSighting called")
  console.log("current user", user)
  console.log("db object", db)
  console.log("payload", { category, note, latitude, longitude })

  if (!user) {
    throw new Error("User not logged in")
  }

  try {
    const result = await addDoc(collection(db, "sightings"), {
      userId: user.uid,
      category,
      note,
      latitude,
      longitude,
      createdAt: serverTimestamp(),
    })

    console.log("addDoc success, id:", result.id)
  } catch (error) {
    console.log("addDoc failed", error)
    throw error
  }
}

export function subscribeToSightings(
  callback: (items: Sighting[]) => void
) {
  return onSnapshot(
    collection(db, "sightings"),
    (snapshot) => {
      console.log("subscribeToSightings snapshot size", snapshot.size)

      const items: Sighting[] = snapshot.docs.map((doc) => {
        const data = doc.data()

        return {
          id: doc.id,
          userId: data.userId,
          category: data.category,
          note: data.note,
          latitude: data.latitude,
          longitude: data.longitude,
        }
      })

      callback(items)
    },
    (error) => {
      console.log("subscribeToSightings failed", error)
    }
  )
}