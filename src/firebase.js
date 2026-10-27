
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAvA_sFhOEL1PkRjOklG_YBUohf2PmB7vo",
  authDomain: "johns-music-8d81e.firebaseapp.com",
  projectId: "johns-music-8d81e",
  storageBucket: "johns-music-8d81e.firebasestorage.app",
  messagingSenderId: "51586649260",
  appId: "1:51586649260:web:35089db94900af782c2309"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
