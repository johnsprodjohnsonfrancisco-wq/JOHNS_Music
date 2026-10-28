
import { useEffect, useRef, useState } from 'react'
import './ChatWidget.css'

const STORAGE_KEY = 'johnsprod-chat-position'

function getInitialPosition() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      const position = JSON.parse(saved)

      if (
        Number.isFinite(position.x) &&
        Number.isFinite(position.y)
      ) {
        return position
      }
    }
  } catch {
    // Utiliser la position par défaut
  }

  return {
    x: Math.max(16, window.innerWidth - 88),
    y: Math.max(16, window.innerHeight - 100),
  }
}

export default function ChatWidget() {
  const [position, setPosition] = useState(getInitialPosition)
  const buttonRef = useRef(null)
  const dragRef = useRef(null)
  const movedRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  const clampPosition = (x, y) => {
    const button = buttonRef.current
    const width = button?.offsetWidth || 60
    const height = button?.offsetHeight || 60

    return {
      x: Math.max(0, Math.min(x, window.innerWidth - width)),
      y: Math.max(0, Math.min(y, window.innerHeight - height)),
    }
  }

  useEffect(() => {
    const safePosition = clampPosition(position.x, position.y)
    setPosition(safePosition)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    } catch {
      // Le bouton reste utilisable même si le stockage est indisponible
    }
  }, [position])

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) =>
        clampPosition(current.x, current.y)
      )
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragRef.current) return

      const dx = event.clientX - dragRef.current.startX
      const dy = event.clientY - dragRef.current.startY

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        movedRef.current = true
        setDragging(true)
      }

      if (movedRef.current) {
        setPosition(
          clampPosition(
            dragRef.current.originX + dx,
            dragRef.current.originY + dy
          )
        )
      }
    }

    const handlePointerUp = () => {
      dragRef.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [])

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return

    movedRef.current = false
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    }
  }

  const openChat = () => {
    if (movedRef.current) {
      movedRef.current = false
      return
    }

    window.location.hash = '#chat'
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`chat-float-button${dragging ? ' is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onClick={openChat}
      aria-label="Déplacer ou ouvrir le chat"
      title="Déplacez-moi ou cliquez pour ouvrir le chat"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        zIndex: 9999,
      }}
    >
      <span>💬</span>
    </button>
  )
}
