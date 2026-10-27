

import { useEffect, useRef, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'firebase/auth'

import { auth, db } from './firebase'

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore'

import './App.css'

const songs = [
  {
    title: '1 - KOA HASANDRATO McPr',
    artist: 'Inconnu',
    color: 'purple',
    type: 'MUSIQUE',
    src: '/songs/1 - KOA HASANDRATO McPr.mp3',
  },
]

const clips = [
  {
    title: 'Videotest',
    artist: 'Inconnu',
    color: 'purple',
    src: '/videos/videotest.mp4',
    category: 'Musique',
  },
]

function App() {
const [downloadHistory, setDownloadHistory] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem('johnsMusicDownloadHistory') || '[]'
    )
  } catch {
    return []
  }
})

const recordDownload = (file) => {
  const entry = {
    ...file,
    downloadedAt: new Date().toISOString(),
    downloadId: `${Date.now()}-${Math.random()}`,
  }

  const updated = [entry, ...downloadHistory]

  localStorage.setItem(
    'johnsMusicDownloadHistory',
    JSON.stringify(updated)
  )

  setDownloadHistory(updated)
}
const [authUser, setAuthUser] = useState(null)
const [authLoading, setAuthLoading] = useState(true)
const [authBusy, setAuthBusy] = useState(false)
const [authError, setAuthError] = useState('')
const [authMessage, setAuthMessage] = useState('')

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setAuthUser(user)
    setAuthLoading(false)
  })

  return unsubscribe
}, [])  
const [showArtistDashboard, setShowArtistDashboard] = useState(false)

const [artistProfile, setArtistProfile] = useState(null)

useEffect(() => {
  if (authLoading) return

  if (!authUser) {
    setArtistProfile(null)
    setArtistSongs([])
    return
  }

  try {
    const savedProfile = JSON.parse(
localStorage.getItem(
  `johnsMusicArtistProfile_${authUser.uid}`
)    )

    if (savedProfile?.uid === authUser.uid) {
      setArtistProfile(savedProfile)

      const savedSongs = JSON.parse(

localStorage.getItem(
  `johnsMusicArtistSongs_${authUser.uid}`
)
      ) || []

      setArtistSongs(savedSongs)
    } else {
      setArtistProfile(null)
      setArtistSongs([])
    }
  } catch {
    setArtistProfile(null)
    setArtistSongs([])
  }
}, [authUser, authLoading])


const [artistSongs, setArtistSongs] = useState([])
const [sharedMedia, setSharedMedia] = useState([])

console.log("Morceaux enregistrés :", artistSongs)
console.log("Médias partagés :", sharedMedia)

useEffect(() => {
  const publishedQuery = query(
    collection(db, 'media'),
    where('status', '==', 'Publié')
  )

  const unsubscribe = onSnapshot(
    publishedQuery,
    (snapshot) => {
      const publishedMedia = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }))

      setSharedMedia(publishedMedia)
    },
    (error) => {
      console.error('Erreur de chargement Firestore :', error)
    }
  )

  return () => unsubscribe()
}, [])

const allArtistSongs = [
  ...artistSongs,
  ...sharedMedia.filter(
    (media) => media.type === 'audio'
  ),
]


const allSongs = [
  ...songs,
  ...allArtistSongs
    .filter((song) => song.url && song.status !== 'Publié')
    .map((song) => ({
      ...song,
      color: 'purple',
      type: 'MUSIQUE',
      src: song.url,
    })),
  ...sharedMedia
    .filter((media) => media.type === 'audio' && media.url)
    .map((media) => ({
      ...media,
      color: 'purple',
      type: 'MUSIQUE',
      src: media.url,
    })),
]
const [uploading, setUploading] = useState(false)
const [uploadError, setUploadError] = useState('')
const [uploadMessage, setUploadMessage] = useState('')
  const [showArtistRegister, setShowArtistRegister] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerPassword, setRegisterPassword] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  console.log("État de connexion :", showLogin)
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

const [selectedClip, setSelectedClip] = useState(null)


const [videoSearch, setVideoSearch] = useState('')
const [homeSearch, setHomeSearch] = useState('')
const [showSearchResults, setShowSearchResults] = useState(false)

const searchText = homeSearch.trim().toLowerCase()

const matchingSongs = allSongs.filter((song) =>  `${song.title} ${song.artist} ${song.type}`
    .toLowerCase()
    .includes(searchText)
)


const allClips = [
  ...clips,
  ...sharedMedia
    .filter((media) => media.type === 'video' && media.url)
    .map((media) => ({
      ...media,
      src: media.url,
      category: media.category || 'Musique',
    })),
]

const matchingClips = allClips.filter((clip) =>
  `${clip.title} ${clip.artist} ${clip.category || ''}`
    .toLowerCase()
    .includes(searchText.toLowerCase())
)


const performSearch = (e) => {
  e.preventDefault()
  if (!homeSearch.trim()) return

  setShowSearchResults(true)
  setSelectedClip(null)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

  useEffect(() => {
    if (!currentSong || !audioRef.current) return

    audioRef.current.currentTime = 0
    setCurrentTime(0)

    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [currentSong])

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    if (audio.paused) {
      try {
        await audio.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }
const getAuthErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/invalid-email':
      return "L'adresse e-mail n'est pas valide."
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou mot de passe incorrect.'
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail possède déjà un compte.'
    case 'auth/weak-password':
      return 'Choisis un mot de passe plus sécurisé.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessaie plus tard.'
    case 'auth/network-request-failed':
      return 'Problème de connexion Internet.'
    case 'auth/operation-not-allowed':
      return "La méthode de connexion par e-mail n'est pas activée dans Firebase."
    case 'auth/invalid-action-code':
      return 'Le lien utilisé est invalide ou a expiré.'
    default:
      return 'Une erreur est survenue. Réessaie.'
  }
}

const handleLogin = async (e) => {
  e.preventDefault()
  setAuthError('')
  setAuthMessage('')
  setAuthBusy(true)

  const form = e.currentTarget
  const email = form.elements.email.value.trim()
  const password = form.elements.password.value

  try {
    await signInWithEmailAndPassword(auth, email, password)
    setShowLogin(false)
    setShowPassword(false)
    form.reset()
  } catch (error) {
    setAuthError(getAuthErrorMessage(error))
  } finally {
    setAuthBusy(false)
  }
}

const handleRegister = async (e) => {
  e.preventDefault()
  setAuthError('')
  setAuthMessage('')

  const form = e.currentTarget
  const fullName = form.elements.fullName.value.trim()
  const email = form.elements.email.value.trim()
  const password = registerPassword
  const confirmation = form.elements.confirmPassword.value

  if (password.length < 8) {
    setAuthError('Le mot de passe doit contenir au moins 8 caractères.')
    return
  }

  if (password !== confirmation) {
    setAuthError('Les mots de passe ne correspondent pas.')
    return
  }

  setAuthBusy(true)

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    )

    await updateProfile(credential.user, {
      displayName: fullName
    })

    setRegisterPassword('')
    setShowRegister(false)
    setShowLogin(false)
    setAuthMessage('Ton compte a été créé avec succès.')
  } catch (error) {
    setAuthError(getAuthErrorMessage(error))
  } finally {
    setAuthBusy(false)
  }
}

const handleForgotPassword = async (e) => {
  e.preventDefault()
  setAuthError('')
  setAuthMessage('')
  setAuthBusy(true)

  const email = e.currentTarget.elements.recoveryEmail.value.trim()

  try {
    await sendPasswordResetEmail(auth, email)
    setAuthMessage(
      'Si cette adresse est enregistrée, un e-mail de récupération sera envoyé.'
    )
    setShowForgotPassword(false)
  } catch (error) {
    setAuthError(getAuthErrorMessage(error))
  } finally {
    setAuthBusy(false)
  }
}


const handleLogout = async () => {
  setAuthError('')
  setAuthMessage('')

  try {
    await signOut(auth)

    setShowArtistDashboard(false)
    setShowArtistRegister(false)
    setArtistProfile(null)
    setArtistSongs([])
    setShowLogin(false)
    setShowRegister(false)
    setShowForgotPassword(false)
  } catch (error) {
    setAuthError(getAuthErrorMessage(error))
  }
}

const handleMediaUpload = async (e) => {
  e.preventDefault()

  setUploadError('')
  setUploadMessage('')

  if (!authUser) {
    setUploadError('Connecte-toi avant de publier un fichier.')
    return
  }

  const form = e.currentTarget
  const title = form.elements.songTitle.value.trim()
  const file = form.elements.mediaFile.files?.[0]

  if (!title || !file) {
    setUploadError('Ajoute un titre et sélectionne un fichier.')
    return
  }

  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ]

  if (!allowedTypes.includes(file.type)) {
    setUploadError(
      'Format non accepté. Essaie MP3, WAV, OGG, MP4 ou WEBM.'
    )
    return
  }

  const maxSize = 100 * 1024 * 1024

  if (file.size > maxSize) {
    setUploadError('Le fichier ne doit pas dépasser 100 Mo.')
    return
  }

  setUploading(true)

  try {
    const token = await authUser.getIdToken()

    const signatureResponse = await fetch(
      'https://johns-music-api.johnsprodjohnsonfrancisco.workers.dev/sign-upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceType: 'video',
        }),
      }
    )

    const signatureData = await signatureResponse.json()

    if (!signatureResponse.ok) {
      throw new Error(
        signatureData.error || 'Impossible de préparer le téléversement.'
      )
    }

    const uploadData = new FormData()
    uploadData.append('file', file)
    uploadData.append('api_key', signatureData.apiKey)
    uploadData.append('timestamp', String(signatureData.timestamp))
    uploadData.append('folder', signatureData.folder)
    uploadData.append('signature', signatureData.signature)

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/video/upload`,
      {
        method: 'POST',
        body: uploadData,
      }
    )

    const mediaData = await uploadResponse.json()

    if (!uploadResponse.ok) {
      throw new Error(
        mediaData.error?.message || 'Échec du téléversement Cloudinary.'
      )
    }


    const newSong = {
      title,
      artist: artistProfile?.artistName || authUser.displayName || 'Artiste',
      type: file.type.startsWith('video/') ? 'video' : 'audio',
      url: mediaData.secure_url,
      publicId: mediaData.public_id,
      uid: authUser.uid,
      status: 'Publié',
      createdAt: new Date().toISOString(),
    }

    // Enregistrer le média dans Firebase Firestore
    const mediaRef = await addDoc(collection(db, 'media'), {
      ...newSong,
      createdAt: serverTimestamp(),
    })

    const savedSong = {
      ...newSong,
      id: mediaRef.id,
    }

    const updatedSongs = [...artistSongs, savedSong]

    localStorage.setItem(
      `johnsMusicArtistSongs_${authUser.uid}`,
      JSON.stringify(updatedSongs)
    )

    setArtistSongs(updatedSongs)
    setUploadMessage('Fichier publié avec succès !')
    form.reset()
  } catch (error) {
    setUploadError(error.message || 'Une erreur est survenue.')
  } finally {
    setUploading(false)
  }
}

  return (
    <div className="app">
      
      {showLogin && (
        <div className="login-overlay" onClick={() => setShowLogin(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="login-close"
              onClick={() => setShowLogin(false)}
              aria-label="Fermer"
            >
              ✕
            </button>

            <h2>Bienvenue sur JOHNS_Music</h2>
            <p>Connecte-toi pour retrouver ton univers musical.</p>

<form onSubmit={handleLogin}>
              <label>Adresse e-mail</label>
              <input
  type="email"
  name="email"
  placeholder="exemple@email.com"
  autoComplete="email"
  required
/>

              <label>Mot de passe</label>

<div className="password-field">
  <input
  type={showPassword ? "text" : "password"}
  name="password"
  placeholder="Ton mot de passe"
  autoComplete="current-password"
  required
/>

<button
  type="button"
  className="password-toggle"
  onClick={() => setShowPassword(!showPassword)}
>
  {showPassword ? "🙈" : "👁️"}
</button>
</div>

              <button type="submit" className="login-submit">
                Se connecter
              </button>
            </form>
            
<div className="login-links">

<button
  type="button"
  onClick={() => {
    setShowLogin(false)
    setShowRegister(true)
    setRegisterPassword('')
  }}
>
  Créer un compte
</button>


<button
  type="button"
  onClick={() => {
    setShowLogin(false)
    setShowForgotPassword(true)
  }}
>
  Mot de passe oublié ?
</button>
</div>

          </div>
        </div>
      )}

{showRegister && (
  <div
    className="login-overlay"
    onClick={() => setShowRegister(false)}
  >
    <div
      className="login-modal register-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="login-close"
        type="button"
        onClick={() => setShowRegister(false)}
        aria-label="Fermer"
      >
        ✕
      </button>

      <h2>Créer un compte</h2>
      <p>Rejoins l'univers JOHNS_Music !</p>

      <form

onSubmit={handleRegister}
      >
        <label>Nom complet</label>
        <input
          type="text"
          name="fullName"
          placeholder="Ton nom complet"
          autoComplete="name"
          required
        />

        <label>Adresse e-mail</label>
        <input
          type="email"
          name="email"
          placeholder="exemple@email.com"
          autoComplete="email"
          required
        />

        <label>Mot de passe</label>
        <input
          type="password"
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          value={registerPassword}
          onChange={(e) => setRegisterPassword(e.target.value)}
          minLength={8}
          required
        />

        <label>Confirmer le mot de passe</label>
        <input
          type="password"
          name="confirmPassword"
          placeholder="Répète ton mot de passe"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button type="submit" className="login-submit">
          Créer mon compte
        </button>
      </form>

      <div className="login-links">
        <button
          type="button"
          onClick={() => {
            setShowRegister(false)
            setShowLogin(true)
          }}
        >
          J'ai déjà un compte
        </button>
      </div>
    </div>
  </div>
)}

{showForgotPassword && (
  <div
    className="login-overlay"
    onClick={() => setShowForgotPassword(false)}
  >
    <div
      className="login-modal forgot-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="login-close"
        type="button"
        onClick={() => setShowForgotPassword(false)}
        aria-label="Fermer"
      >
        ✕
      </button>

      <h2>Mot de passe oublié ?</h2>
      <p>
        Saisis ton adresse e-mail pour demander la récupération de ton compte.
      </p>

      <form

onSubmit={handleForgotPassword}
      >
        <label>Adresse e-mail</label>
        <input
          type="email"
          name="recoveryEmail"
          placeholder="exemple@email.com"
          autoComplete="email"
          required
        />

        <button type="submit" className="login-submit">
          Demander la récupération
        </button>
      </form>

      <div className="login-links">
        <button
          type="button"
          onClick={() => {
            setShowForgotPassword(false)
            setShowLogin(true)
          }}
        >
          Retour à la connexion
        </button>

      </div>
    </div>
  </div>
)}


{showArtistRegister && (
  <div
    className="login-overlay artist-overlay"
    onClick={() => setShowArtistRegister(false)}
  >
    <div
      className="login-modal artist-register-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="login-close"
        type="button"
        onClick={() => setShowArtistRegister(false)}
        aria-label="Fermer"
      >
        ✕
      </button>

      <div className="artist-form-header">
        <div className="artist-form-icon">♫</div>
        <span className="section-kicker">JOHNS_MUSIC ARTISTE</span>
        <h2>Rejoins notre communauté</h2>
        <p>
          Crée ton profil artiste et fais découvrir ton univers musical.
        </p>
      </div>

      <form
        className="artist-form"
        onSubmit={(e) => {
          e.preventDefault()

          const form = e.currentTarget
          if (!authUser) {
  setShowArtistRegister(false)
  setShowLogin(true)
  return
}
          const profile = {
            artistName: form.elements.artistName.value.trim(),
            uid: authUser.uid,
            fullName: form.elements.fullName.value.trim(),
            email: form.elements.artistEmail.value.trim(),
            genre: form.elements.genre.value,
            bio: form.elements.bio.value.trim(),
            createdAt: new Date().toISOString()
          }

          if (
            !profile.artistName ||
            !profile.fullName ||
            !profile.email ||
            !profile.genre
          ) {
            alert('Veuillez remplir tous les champs obligatoires.')
            return
          }

          try {


localStorage.setItem(
  `johnsMusicArtistProfile_${authUser.uid}`,
  JSON.stringify(profile)
)
setArtistProfile(profile)
setShowArtistRegister(false)
setShowArtistDashboard(true)
          } catch {
            alert("Impossible d'enregistrer le profil.")
          }
        }}
      >
        <div className="artist-form-field">
          <label htmlFor="artistName">Nom d’artiste *</label>
          <input
            id="artistName"
            name="artistName"
            placeholder="Ex. JOHNS_Prod"
            autoComplete="nickname"
            maxLength={50}
            required
          />
        </div>

        <div className="artist-form-field">
          <label htmlFor="fullName">Nom complet *</label>
          <input
            id="fullName"
            name="fullName"
            placeholder="Ton nom et prénom"
            autoComplete="name"
            maxLength={100}
            required
          />
        </div>

        <div className="artist-form-field">
          <label htmlFor="artistEmail">Adresse e-mail *</label>
          <input
            id="artistEmail"
            name="artistEmail"
            type="email"
            placeholder="exemple@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="artist-form-field">
          <label htmlFor="genre">Genre musical *</label>
          <select
            id="genre"
            name="genre"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Choisis ton style musical
            </option>
            <option value="Afrobeat">Afrobeat</option>
            <option value="Rap / Drill">Rap / Drill</option>
            <option value="Tsapiky">Tsapiky</option>
            <option value="Gospel">Gospel</option>
            <option value="Salegy">Salegy</option>
            <option value="Reggae">Reggae</option>
            <option value="Pop">Pop</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div className="artist-form-field">
          <label htmlFor="bio">Biographie <span>(facultatif)</span></label>
          <textarea
            id="bio"
            name="bio"
            placeholder="Présente ton parcours, tes inspirations et ton style..."
            rows={4}
            maxLength={500}
          />
          <small>500 caractères maximum</small>
        </div>

        <button type="submit" className="login-submit artist-submit">
          Créer mon profil artiste <span>→</span>
        </button>

        <p className="artist-form-note">
          * Champs obligatoires
        </p>
      </form>
    </div>
  </div>
)}

{showArtistDashboard && artistProfile && (
  <div className="login-overlay" onClick={() => setShowArtistDashboard(false)}>
    <div
      className="login-modal artist-register-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="login-close"
        type="button"
        onClick={() => setShowArtistDashboard(false)}
        aria-label="Fermer"
      >
        ✕
      </button>

      <div className="artist-form-header">
        <div className="artist-form-icon">♫</div>
        <span className="section-kicker">JOHNS_MUSIC ARTIST SPACE</span>
        <h2>Bienvenue, {artistProfile.artistName}</h2>
        <p>Ton espace personnel d'artiste.</p>
      </div>

      <div className="artist-dashboard-content">
        <h3>Mon profil</h3>
        <p><strong>Nom d'artiste :</strong> {artistProfile.artistName}</p>
        <p><strong>Nom complet :</strong> {artistProfile.fullName}</p>
        <p><strong>E-mail :</strong> {artistProfile.email}</p>
        <p><strong>Genre :</strong> {artistProfile.genre}</p>
        <p><strong>Biographie :</strong> {artistProfile.bio || 'Aucune biographie'}</p>

        <hr />

        <h3>Mes musiques ({artistSongs.length})</h3>

        {artistSongs.length === 0 ? (
          <p>Tu n'as pas encore ajouté de musique.</p>
        ) : (
          <ul>
            {artistSongs.map((song) => (
              <li key={song.id}>
                <strong>{song.title}</strong> — {song.status}
              </li>
            ))}
          </ul>
        )}


<form className="artist-form" onSubmit={handleMediaUpload}>
  <label htmlFor="songTitle">Titre de la musique ou du clip</label>
  <input
    id="songTitle"
    name="songTitle"
    placeholder="Nom de ton titre"
    maxLength={100}
    required
  />


<label htmlFor="mediaFile">Choisir un fichier audio ou vidéo</label>

<label htmlFor="mediaFile" className="custom-file-upload">
  <span className="upload-icon">↑</span>
  <span>
    <strong>Importer un fichier</strong>
    <small>Audio ou vidéo · Clique pour parcourir</small>
  </span>
</label>

<input
  id="mediaFile"
  name="mediaFile"
  type="file"
  accept="audio/*,video/mp4,video/webm,video/quicktime"
  required
  className="hidden-file-input"
/>

  {uploadError && <p role="alert">{uploadError}</p>}
  {uploadMessage && <p role="status">{uploadMessage}</p>}

  <button
    type="submit"
    className="login-submit"
    disabled={uploading}
  >
    {uploading ? 'Téléversement en cours…' : '+ Publier mon fichier'}
  </button>
</form>

        <button
          type="button"
          className="login-submit"
          onClick={() => {
            setShowArtistDashboard(false)
            setShowArtistRegister(true)
          }}
        >
          Modifier mon profil
        </button>
      </div>
    </div>
  </div>
)}

      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">♫</span>
          <span>JOHNS<span className="brand-accent">_Music</span></span>
        </a>

        <div className="side-label">MENU PRINCIPAL</div>
        <nav className="navigation">
          <a className="nav-link active" href="#accueil">⌂ <span>Accueil</span></a>
          <a className="nav-link" href="#musique">♫ <span>Musique</span></a>
          <a className="nav-link" href="#clips">▷ <span>Clips vidéo</span></a>
          <a className="nav-link" href="#artistes">♙ <span>Artistes</span></a>
          <a className="nav-link" href="#telechargements">↓ <span>Téléchargements</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="artist-promo">
            <div className="promo-icon">♫</div>
            <h3>Tu es artiste ?</h3>
            <p>Fais découvrir ta musique au monde entier.</p>


<button
  onClick={() => {
    setShowLogin(false)
    setShowRegister(false)
    setShowForgotPassword(false)

    if (!authUser) {
      setAuthError('')
      setAuthMessage('')
      setShowLogin(true)
      return
    }

    setShowArtistRegister(true)
  }}
>
  Devenir artiste
</button>
          </div>
          <p className="sidebar-footer">JOHNS_Music © 2026</p>
        </div>
      </aside>

      <main className="main-content" id="accueil">
        
{showSearchResults && (
  <section className="search-results-page">
    <button
      className="search-back-button"
      onClick={() => setShowSearchResults(false)}
    >
      ← Retour à l'accueil
    </button>

    <div className="search-results-heading">
      <span className="section-kicker">JOHNS_MUSIC SEARCH</span>
      <h1>Résultats de recherche</h1>
      <p>
        Recherche pour : <strong>« {homeSearch.trim()} »</strong>
      </p>
      <span className="search-result-count">
        {matchingSongs.length + matchingClips.length} résultat(s)
      </span>
    </div>

    <section className="content-section">
      <div className="section-heading">
        <h2>♫ Musiques</h2>
        <span>{matchingSongs.length} résultat(s)</span>
      </div>

      {matchingSongs.length === 0 ? (
        <p className="no-results">Aucune musique trouvée.</p>
      ) : (
        <div className="music-grid">
          {matchingSongs.map((song, index) => (
            <article className="music-card" key={song.title}>
              <div className={`cover ${song.color}`}>
                <span className="cover-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="cover-type">MUSIQUE</span>
              </div>

              <h3>{song.title}</h3>
              <p>{song.artist}</p>

              <button
                className="card-action"
                disabled={!song.src}
                onClick={() => setCurrentSong(song)}
              >
                ▶ Écouter
              </button>
            </article>
          ))}
        </div>
      )}
    </section>

    <section className="content-section">
      <div className="section-heading">
        <h2>▷ Clips vidéo</h2>
        <span>{matchingClips.length} résultat(s)</span>
      </div>

      {matchingClips.length === 0 ? (
        <p className="no-results">Aucun clip trouvé.</p>
      ) : (
        <div className="clip-grid">
          {matchingClips.map((clip) => (
            <article className="clip-card" key={clip.title}>
              <button
                className="clip-cover video-thumbnail"
                onClick={() => {
                  setSelectedClip(clip)
                  setShowSearchResults(false)
                }}
                aria-label={`Regarder ${clip.title}`}
              >
<video
  src={clip.src}
  preload="none"
  muted
  playsInline
  poster=""
/>                <span className="clip-play">▶</span>
                <span className="clip-badge">CLIP</span>
              </button>

              <h3>{clip.title}</h3>
              <p>{clip.artist}</p>

              <button
                className="card-action"
                onClick={() => {
                  setSelectedClip(clip)
                  setShowSearchResults(false)
                }}
              >
                ▶ Regarder
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  </section>
)}

        <header className="topbar">


<form className="search-box" onSubmit={performSearch}>
  <span>⌕</span>
  <input
    type="search"
    placeholder="Rechercher un titre, un artiste..."
    value={homeSearch}
    onChange={(e) => {
      setHomeSearch(e.target.value)
      setShowSearchResults(false)
    }}
  />
  <button type="submit" aria-label="Rechercher">Rechercher</button>
</form>



{authLoading ? null : authUser ? (
  <button
    className="login-button"
    onClick={handleLogout}
  >
    <span aria-hidden="true">♙</span>
    Se déconnecter
  </button>
) : (
  <button
    className="login-button"
    onClick={() => setShowLogin(true)}
  >
    <span aria-hidden="true">♙</span>
    Se connecter
  </button>
)}
</header>

        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">BIENVENUE SUR JOHNS_MUSIC</span>
            <h1>Ta musique.<br />Ton univers.</h1>
            <p>Découvre de nouveaux sons, regarde des clips et soutiens les artistes.</p>
            <div className="hero-actions">
              <a href="#musique" className="primary-button">♫ Découvrir la musique</a>
              <a href="#clips" className="secondary-button">▷ Explorer les clips</a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="disc"><div className="disc-center">JM</div></div>
            <span className="floating-note note-one">♫</span>
            <span className="floating-note note-two">♪</span>
          </div>
        </section>

        <section className="content-section" id="musique">
          <div className="section-heading">
            <div><span className="section-kicker">À ÉCOUTER</span><h2>Musiques à découvrir</h2></div>
            <a href="#musique">Voir tout ↗</a>
          </div>
          <div className="music-grid">


{matchingSongs.map((song, index) => (
              <article className="music-card" key={song.title}>

<div className={`cover ${song.color}`}>
  <span className="cover-number">0{index + 1}</span>

  <button
    className="audio-play-center"
    disabled={!song.src}
    onClick={() => {
      if (currentSong?.title === song.title) {
        togglePlayback()
      } else {
        setCurrentSong(song)
      }
    }}
    aria-label={`Écouter ${song.title}`}
  >
    {currentSong?.title === song.title && isPlaying ? 'Ⅱ' : '▶'}
  </button>

  <span className="cover-type">{song.type}</span>
</div>
                <h3>{song.title}</h3>
                <p>{song.artist}</p>

{song.src && (
<a
  className="card-action download-action"
  href={song.src}
  download
  onClick={() => recordDownload({
    title: song.title,
    artist: song.artist,
    type: 'Musique',
    url: song.src,
  })}
>
  ⬇ Télécharger
</a>
)}



<button
  className="card-action"
  disabled={!song.src}
  onClick={() => {
    if (currentSong?.title === song.title && isPlaying) {
      togglePlayback()
    } else if (currentSong?.title === song.title) {
      togglePlayback()
    } else {
      setCurrentSong(song)
    }
  }}
>
  {currentSong?.title === song.title && isPlaying ? '⏸ Pause' : '▶ Play'}
</button>
              </article>
            ))}
          </div>
        </section>


<section className="content-section" id="clips">
  <div className="section-heading">
    <div>
      <span className="section-kicker">JOHNS_MUSIC VIDEO</span>
      <h2>Découvre les clips</h2>
    </div>
    <span>{clips.length} vidéos</span>
  </div>

  <div className="video-search">
    <input
      type="search"
      placeholder="Rechercher un clip ou un artiste..."
      value={videoSearch}
      onChange={(e) => setVideoSearch(e.target.value)}
    />
  </div>

  {selectedClip && (
    <div className="video-player-panel">
      <div className="video-player-heading">
        <div>
          <h2>{selectedClip.title}</h2>
          <p>{selectedClip.artist}</p>
        </div>
        <button onClick={() => setSelectedClip(null)}>Fermer ✕</button>
      </div>

      <video
        key={selectedClip.src}
        className="main-video"
        src={selectedClip.src}
        controls
        autoPlay
        playsInline
      >
        Ton navigateur ne prend pas en charge la vidéo.
      </video>


<a
  className="video-download"
  href={selectedClip.src}
  download
  onClick={() =>
    recordDownload({
      title: selectedClip.title,
      artist: selectedClip.artist,
      type: 'Vidéo',
      url: selectedClip.src,
    })
  }
>
  ⬇ Télécharger le clip
</a>
    </div>
  )}



<div className="clip-grid">
  {allClips
    .filter((clip) =>
      `${clip.title} ${clip.artist} ${clip.category || ''}`
        .toLowerCase()
        .includes(videoSearch.trim().toLowerCase())
    )
    .length === 0 ? (
      <p className="no-results">
        🔍 Aucun clip trouvé pour « {videoSearch} ».
        Essayez un autre titre ou artiste.
      </p>
    ) : (
      allClips
        .filter((clip) =>
          `${clip.title} ${clip.artist} ${clip.category || ''}`
            .toLowerCase()
            .includes(videoSearch.trim().toLowerCase())
        )
        .map((clip) => (
          <article
            className="clip-card"
            key={clip.id || clip.src || clip.title}
          >
            <button
              className="clip-cover video-thumbnail"
              onClick={() => setSelectedClip(clip)}
              aria-label={`Regarder ${clip.title}`}
            >
              <video
                src={clip.src}
                preload="metadata"
                muted
                playsInline
              />
              <span className="clip-play">▶</span>
              <span className="clip-badge">CLIP</span>
            </button>

            <h3>{clip.title}</h3>
            <p>{clip.artist}</p>

            <div className="clip-actions">
              <button
                className="card-action audio-action"
                onClick={() => setSelectedClip(clip)}
              >
                ▶ Regarder
              </button>

              {clip.src && (
                <a
                  className="card-action download-action"
                  href={clip.src}
                  download
                >
                  ⬇ Télécharger
                </a>
              )}
            </div>
          </article>
        ))
    )}
</div>
</section>

        <section className="artist-banner" id="artistes">
          <div><span className="section-kicker">LA SCÈNE MUSICALE</span><h2>La prochaine découverte, c'est peut-être toi.</h2><p>Rejoins une communauté dédiée à la musique.</p></div>



<button
  onClick={() => {
    setShowRegister(false)
    setShowForgotPassword(false)
    setAuthError('')
    setAuthMessage('')

    if (!authUser) {
      setShowArtistDashboard(false)
      setShowArtistRegister(false)
      setShowLogin(true)
      return
    }

    const profile = (() => {
      try {
        return JSON.parse(
localStorage.getItem(
  `johnsMusicArtistProfile_${authUser.uid}`
)        )
      } catch {
        return null
      }
    })()

    setShowArtistRegister(false)

    if (profile) {
      setArtistProfile(profile)
      setShowArtistDashboard(true)
    } else {
      setShowArtistDashboard(false)
      setShowArtistRegister(true)
    }
  }}
>
  Espace artiste ↗
</button>
        </section>

        <footer className="page-footer" id="telechargements">
          <a className="brand footer-brand" href="#accueil">♫ JOHNS<span className="brand-accent">_Music</span></a>
          <p>La musique, partout avec vous.</p>
          <span>© 2026 JOHNS_Music. Tous droits réservés.</span>
        </footer>

        {currentSong && (
          <div className="bottom-player">
            <audio
              ref={audioRef}
              src={currentSong.src}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onDurationChange={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
<button
  className="close-player"
  onClick={() => {
    audioRef.current?.pause()
    setCurrentSong(null)
    setIsPlaying(false)
  }}
  aria-label="Fermer le lecteur"
>
  ✕
</button>
            <div className="player-song">
              <div className={`player-cover ${currentSong.color}`}>♫</div>
              <div className="player-info">
                <strong>{currentSong.title}</strong>
                <span>{currentSong.artist}</span>
              </div>
            </div>

            <div className="player-center">
              <button
                className="player-play"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Mettre en pause' : 'Lire'}
              >
                {isPlaying ? 'Ⅱ' : '▶'}
              </button>

              <div className="player-progress">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (audioRef.current) {
                      audioRef.current.currentTime = value
                      setCurrentTime(value)
                    }
                  }}
                  aria-label="Progression de la chanson"
                />
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="player-volume">
              <span>🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue="0.8"
                onChange={(e) => {
                  if (audioRef.current) {
                    audioRef.current.volume = Number(e.target.value)
                  }
                }}
                aria-label="Volume"
              />
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App
