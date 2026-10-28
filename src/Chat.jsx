
import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import './Chat.css'

export default function Chat({ onLogin }) {
  const [mode, setMode] = useState('public')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)

  const user = auth.currentUser

  const selectedMember = members.find(
    (member) => member.uid === recipientId
  )

  // Charger les profils des membres connectés à la communauté.
  useEffect(() => {
    if (!user || mode !== 'private') return

    setLoadingMembers(true)
    setError('')

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => {
            const data = item.data()

            return {
              uid: data.uid || item.id,
              name:
                data.fullName ||
                data.displayName ||
                data.username ||
                data.name ||
                'Membre',
              photoURL: data.photoURL || '',
            }
          })
          .filter(
            (member) =>
              member.uid !== user.uid &&
              member.name.trim() !== ''
          )

        setMembers(list)
        setLoadingMembers(false)
      },
      (err) => {
        console.error('Erreur de chargement des membres :', err)
        setError(
          'Impossible de charger les membres. Les règles Firestore doivent autoriser la lecture des profils publics.'
        )
        setLoadingMembers(false)
      }
    )

    return unsubscribe
  }, [user?.uid, mode])

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()

    if (!term) return []

    return members
      .filter((member) =>
        member.name.toLocaleLowerCase().includes(term)
      )
      .slice(0, 20)
  }, [members, search])

  // Charger les messages publics ou privés.
  useEffect(() => {
    if (!user) {
      setMessages([])
      return
    }

    if (mode === 'private' && !recipientId) {
      setMessages([])
      return
    }

    const conversationId =
      mode === 'private'
        ? [user.uid, recipientId].sort().join('_')
        : null

    const messagesRef =
      mode === 'public'
        ? collection(db, 'publicChat')
        : collection(
            db,
            'privateChats',
            conversationId,
            'messages'
          )

    const messagesQuery = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      limit(200)
    )

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        )
        setError('')
      },
      (err) => {
        console.error('Erreur de chargement des messages :', err)
        setError(
          'Impossible de charger les messages. Vérifie les règles Firestore.'
        )
      }
    )

    return unsubscribe
  }, [mode, recipientId, user?.uid])

  function selectMember(member) {
    setRecipientId(member.uid)
    setSearch('')
    setMessages([])
    setError('')
  }

  async function sendMessage(event) {
    event.preventDefault()
    setError('')

    const messageText = text.trim()

    if (!user) {
      setError('Connecte-toi pour discuter.')
      return
    }

    if (!messageText) return

    try {
      const senderName =
        user.displayName || 'Membre'

      const messageData = {
        text: messageText,
        senderId: user.uid,
        senderName,
        createdAt: serverTimestamp(),
      }

      if (mode === 'public') {
        await addDoc(collection(db, 'publicChat'), messageData)
      } else {
        if (!recipientId || recipientId === user.uid) {
          setError('Recherche et sélectionne un membre.')
          return
        }

        const membersList = [user.uid, recipientId].sort()
        const conversationId = membersList.join('_')

        const conversationRef = doc(
          db,
          'privateChats',
          conversationId
        )

        const conversationSnapshot = await getDoc(conversationRef)

        if (!conversationSnapshot.exists()) {
          await setDoc(conversationRef, {
            members: membersList,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          const conversationData = conversationSnapshot.data()

          if (
            !Array.isArray(conversationData.members) ||
            !membersList.every((id) =>
              conversationData.members.includes(id)
            )
          ) {
            setError('Cette conversation n’est pas autorisée.')
            return
          }
        }

        await addDoc(
          collection(
            db,
            'privateChats',
            conversationId,
            'messages'
          ),
          messageData
        )

        await setDoc(
          conversationRef,
          { updatedAt: serverTimestamp() },
          { merge: true }
        )
      }

      setText('')
    } catch (err) {
      console.error('Erreur d’envoi :', err)
      setError(
        'Envoi impossible. Vérifie les règles Firestore et réessaie.'
      )
    }
  }

  if (!user) {
    return (
      <section className="chat-box chat-login-card">
        <div className="chat-login-icon">💬</div>
        <h2>JOHNS_Music Chat</h2>
        <p>
          Connecte-toi pour discuter avec les membres
          de la communauté JOHNS_Music.
        </p>
        <button
          type="button"
          className="chat-login-button"
          onClick={onLogin}
        >
          Se connecter →
        </button>
      </section>
    )
  }

  return (
    <section className="chat-box">
      <h2>JOHNS_Music Chat</h2>

      <div className="chat-tabs">
        <button
          type="button"
          className={mode === 'public' ? 'active' : ''}
          onClick={() => {
            setMode('public')
            setError('')
          }}
        >
          Public
        </button>

        <button
          type="button"
          className={mode === 'private' ? 'active' : ''}
          onClick={() => {
            setMode('private')
            setError('')
          }}
        >
          Messages privés
        </button>
      </div>

      {mode === 'private' && (
        <div className="chat-member-search">
          <label htmlFor="chat-member-search">
            Rechercher un membre
          </label>

          <input
            id="chat-member-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="🔍 Nom du membre..."
            autoComplete="off"
          />

          {loadingMembers && (
            <p className="chat-empty">Chargement des membres...</p>
          )}

          {!loadingMembers &&
            search.trim() !== '' &&
            filteredMembers.length === 0 && (
              <p className="chat-empty">
                Aucun membre trouvé.
              </p>
            )}

          {filteredMembers.length > 0 && (
            <div className="chat-member-results">
              {filteredMembers.map((member) => (
                <button
                  type="button"
                  key={member.uid}
                  className="chat-member-result"
                  onClick={() => selectMember(member)}
                >
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt=""
                      className="chat-member-avatar"
                    />
                  ) : (
                    <span className="chat-member-avatar chat-avatar-placeholder">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}

                  <span className="chat-member-info">
                    <strong>{member.name}</strong>
                  </span>

                  <span aria-hidden="true">💬</span>
                </button>
              ))}
            </div>
          )}

          {selectedMember && (
            <div className="chat-selected-member">
              <span>
                Conversation avec{' '}
                <strong>{selectedMember.name}</strong>
              </span>

              <button
                type="button"
                onClick={() => {
                  setRecipientId('')
                  setMessages([])
                  setError('')
                }}
              >
                Changer
              </button>
            </div>
          )}

          {!recipientId && (
            <p className="chat-empty">
              Recherche un membre et sélectionne-le pour commencer.
            </p>
          )}
        </div>
      )}

      <div className="chat-messages">
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.senderId === user.uid
                ? 'chat-message mine'
                : 'chat-message'
            }
          >
            <strong>{message.senderName || 'Membre'}</strong>
            <p>{message.text}</p>
          </article>
        ))}

        {messages.length === 0 && (
          <p className="chat-empty">
            {mode === 'private' && !recipientId
              ? 'Sélectionne un membre pour voir la conversation.'
              : 'Aucun message pour le moment.'}
          </p>
        )}
      </div>

      {error && <p className="chat-error">{error}</p>}

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            mode === 'private' && !recipientId
              ? 'Sélectionne un membre avant d’écrire'
              : 'Écris ton message...'
          }
          maxLength={2000}
          disabled={mode === 'private' && !recipientId}
        />

        <button
          type="submit"
          disabled={
            !text.trim() ||
            (mode === 'private' && !recipientId)
          }
        >
          Envoyer
        </button>
      </form>
    </section>
  )
}
