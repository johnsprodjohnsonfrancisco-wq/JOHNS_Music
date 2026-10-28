
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  where,
  getDocs,
} from 'firebase/firestore'

import { auth, db } from './firebase'

// Messages publics
export function listenToPublicMessages(callback) {
  const messagesRef = collection(db, 'publicChat')
  const messagesQuery = query(
    messagesRef,
    orderBy('createdAt', 'asc'),
    limit(200)
  )

  return onSnapshot(messagesQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })))
  })
}

// Envoyer un message public
export async function sendPublicMessage(text) {
  const user = auth.currentUser
  const message = text.trim()

  if (!user) throw new Error('Connecte-toi pour envoyer un message.')
  if (!message) return

  await addDoc(collection(db, 'publicChat'), {
    text: message,
    senderId: user.uid,
    senderName: user.displayName || user.email || 'Membre',
    createdAt: serverTimestamp(),
  })
}

// Identifiant stable pour une conversation privée
function conversationId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}

// Écouter les messages d’une conversation privée
export function listenToPrivateMessages(otherUserId, callback) {
  const user = auth.currentUser
  if (!user || !otherUserId || user.uid === otherUserId) {
    throw new Error('Conversation invalide.')
  }

  const id = conversationId(user.uid, otherUserId)
  const messagesRef = collection(db, 'privateChats', id, 'messages')
  const messagesQuery = query(
    messagesRef,
    orderBy('createdAt', 'asc'),
    limit(200)
  )

  return onSnapshot(messagesQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })))
  })
}

// Envoyer un message privé
export async function sendPrivateMessage(otherUserId, text) {
  const user = auth.currentUser
  const message = text.trim()

  if (!user) throw new Error('Connecte-toi pour envoyer un message.')
  if (!otherUserId || user.uid === otherUserId) {
    throw new Error('Destinataire invalide.')
  }
  if (!message) return

  const id = conversationId(user.uid, otherUserId)
  const conversationRef = doc(db, 'privateChats', id)
  const conversationSnapshot = await getDoc(conversationRef)

  const members = [user.uid, otherUserId].sort()

  if (!conversationSnapshot.exists()) {
    await setDoc(conversationRef, {
      members,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    const existingMembers = conversationSnapshot.data().members || []
    if (!members.every((member) => existingMembers.includes(member))) {
      throw new Error('Accès à cette conversation refusé.')
    }
  }

  await addDoc(collection(db, 'privateChats', id, 'messages'), {
    text: message,
    senderId: user.uid,
    senderName: user.displayName || user.email || 'Membre',
    createdAt: serverTimestamp(),
  })
}
