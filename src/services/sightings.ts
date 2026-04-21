import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
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

  if (!user) {
    throw new Error("User not logged in")
  }

  await addDoc(collection(db, "sightings"), {
    userId: user.uid,
    category,
    note,
    latitude,
    longitude,
    createdAt: serverTimestamp(),
  })
}

export function subscribeToSightings(
  callback: (items: Sighting[]) => void
) {
  const sightingsQuery = query(
    collection(db, "sightings"),
    orderBy("createdAt", "desc")
  )

  return onSnapshot(sightingsQuery, (snapshot) => {
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
  })
}