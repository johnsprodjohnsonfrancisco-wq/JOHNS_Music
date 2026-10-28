
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export async function syncPublicProfile(user) {
  if (!user?.uid) {
    throw new Error('Utilisateur non connecté.')
  }

  // Lire uniquement le profil de l'utilisateur connecté.
  const userRef = doc(db, 'users', user.uid)
  const userSnapshot = await getDoc(userRef)

  const profile = userSnapshot.exists()
    ? userSnapshot.data()
    : {}

  const displayName =
    profile.fullName ||
    profile.displayName ||
    profile.username ||
    profile.name ||
    user.displayName ||
    'Membre'

  const photoURL =
    profile.photoURL ||
    user.photoURL ||
    ''

  // Publier uniquement les informations nécessaires à la recherche.
  await setDoc(
    doc(db, 'publicProfiles', user.uid),
    {
      displayName,
      photoURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}
