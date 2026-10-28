
import { useEffect, useState } from 'react'
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
  const [error, setError] = useState('')
  const user = auth.currentUser

  useEffect(() => {
    if (!user) return

    let messagesQuery
    let conversationId

    if (mode === 'public') {
      messagesQuery = query(
        collection(db, 'publicChat'),
        orderBy('createdAt', 'asc'),
        limit(200)
      )
    } else {
      if (!recipientId.trim() || recipientId === user.uid) {
        setMessages([])
        return
      }

      conversationId = [user.uid, recipientId.trim()].sort().join('_')
      messagesQuery = query(
        collection(db, 'privateChats', conversationId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(200)
      )
    }

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })))
        setError('')
      },
      (err) => setError(err.message)
    )
  }, [mode, recipientId, user?.uid])

  async function sendMessage(event) {
    event.preventDefault()
    setError('')

    const message = text.trim()
    if (!user) {
      setError('Connecte-toi pour discuter.')
      return
    }
    if (!message) return

    try {
      if (mode === 'public') {
        await addDoc(collection(db, 'publicChat'), {
          text: message,
          senderId: user.uid,
          senderName: user.displayName || user.email || 'Membre',
          createdAt: serverTimestamp(),
        })
      } else {
        const otherId = recipientId.trim()
        if (!otherId || otherId === user.uid) {
          setError('Entre l’identifiant d’un autre membre.')
          return
        }

        const id = [user.uid, otherId].sort().join('_')
        const conversationRef = doc(db, 'privateChats', id)
        const conversation = await getDoc(conversationRef)

        if (!conversation.exists()) {
          await setDoc(conversationRef, {
            members: [user.uid, otherId].sort(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else if (!(conversation.data().members || []).includes(user.uid) ||
                   !(conversation.data().members || []).includes(otherId)) {
          setError('Conversation non autorisée.')
          return
        }

        await addDoc(
          collection(db, 'privateChats', id, 'messages'),
          {
            text: message,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'Membre',
            createdAt: serverTimestamp(),
          }
        )
      }

      setText('')
    } catch (err) {
      setError('Envoi impossible : ' + err.message)
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
          onClick={() => setMode('public')}
        >
          Public
        </button>
        <button
          type="button"
          className={mode === 'private' ? 'active' : ''}
          onClick={() => setMode('private')}
        >
          Privé
        </button>
      </div>

      {mode === 'private' && (
        <label className="chat-recipient">
          UID du destinataire
          <input
            value={recipientId}
            onChange={(event) => setRecipientId(event.target.value)}
            placeholder="Identifiant Firebase du membre"
          />
        </label>
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
          <p className="chat-empty">Aucun message pour le moment.</p>
        )}
      </div>

      {error && <p className="chat-error">{error}</p>}

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Écris ton message..."
          maxLength={2000}
        />
        <button type="submit">Envoyer</button>
      </form>
    </section>
  )
}
