
import './ChatWidget.css'

export default function ChatWidget() {
  const openChat = () => {
    window.location.hash = '#chat'
  }

  return (
    <button
      type="button"
      className="chat-float-button"
      onClick={openChat}
      aria-label="Ouvrir le chat"
      title="Ouvrir le chat"
    >
      <span>💬</span>
    </button>
  )
}
