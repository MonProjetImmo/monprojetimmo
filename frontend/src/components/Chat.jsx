import React, { useState, useRef, useEffect } from 'react';
import { agentAPI, publishAPI } from '../api/index.js';

const SUGGESTIONS = [
  'Crée un post Instagram pour une villa avec piscine à Salon-de-Provence',
  'Montre-moi le calendrier éditorial de la semaine',
  'Génère 3 idées de contenu TikTok pour ce mois',
  'Rédige un post Facebook sur le marché immobilier local'
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis Alex, votre community manager IA pour Mon Projet Immo. Je peux générer des posts pour Instagram, Facebook et TikTok, gérer votre calendrier éditorial, et analyser vos annonces immobilières. Comment puis-je vous aider aujourd\'hui ?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState(null);
  const [publishStates, setPublishStates] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    setToolActivity(null);

    try {
      const res = await agentAPI.chat(msg);
      const { response, toolResults } = res.data;

      if (toolResults?.length) {
        const toolNames = toolResults.map((t) => t.tool_name).join(', ');
        setToolActivity(`Outils utilisés : ${toolNames}`);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Désolé, une erreur s'est produite : ${err.response?.data?.error || err.message}`, error: true }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    await agentAPI.clearHistory();
    setMessages([
      { role: 'assistant', content: 'Historique effacé. Nouvelle conversation démarrée !' }
    ]);
    setToolActivity(null);
  }

  function setPubState(index, state) {
    setPublishStates((prev) => ({ ...prev, [index]: state }));
  }

  async function confirmPublish(index, caption) {
    const imageUrl = publishStates[index]?.imageUrl?.trim();
    if (!imageUrl) return;
    setPubState(index, { status: 'loading', imageUrl });
    try {
      await publishAPI.instagram(imageUrl, caption);
      setPubState(index, { status: 'success' });
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error || err.message;
      setPubState(index, { status: 'error', detail, imageUrl });
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Agent IA — Alex</h1>
          <p style={styles.subtitle}>Community manager expert en immobilier provençal</p>
        </div>
        <button onClick={clearHistory} className="btn btn-outline btn-sm">
          Nouvelle conversation
        </button>
      </header>

      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.messageRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && <div style={styles.avatar}>🤖</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '75%' }}>
              <div style={{
                ...styles.bubble,
                maxWidth: '100%',
                ...(msg.role === 'user' ? styles.userBubble : styles.aiBubble),
                ...(msg.error ? styles.errorBubble : {})
              }}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === 'assistant' && isInstagramPost(msg.content) && (() => {
                const pub = publishStates[i];
                if (pub?.status === 'success') {
                  return <div style={styles.pubSuccess}>✅ Publié sur Instagram !</div>;
                }
                if (pub?.status === 'prompting' || pub?.status === 'error' || pub?.status === 'loading') {
                  return (
                    <div style={styles.pubForm}>
                      <input
                        type="url"
                        placeholder="URL de l'image (requis)"
                        value={pub.imageUrl ?? ''}
                        onChange={(e) => setPubState(i, { ...pub, imageUrl: e.target.value })}
                        style={styles.pubInput}
                        disabled={pub.status === 'loading'}
                      />
                      <button
                        onClick={() => confirmPublish(i, msg.content)}
                        disabled={!pub.imageUrl?.trim() || pub.status === 'loading'}
                        style={styles.pubConfirm}
                      >
                        {pub.status === 'loading' ? '…' : 'Confirmer'}
                      </button>
                      {pub.status === 'error' && (
                        <div style={styles.pubError}>{pub.detail}</div>
                      )}
                    </div>
                  );
                }
                return (
                  <button
                    onClick={() => setPubState(i, { status: 'prompting', imageUrl: '' })}
                    style={styles.pubButton}
                  >
                    📸 Publier sur Instagram
                  </button>
                );
              })()}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
            <div style={styles.avatar}>🤖</div>
            <div style={{ ...styles.bubble, ...styles.aiBubble }}>
              <div style={styles.typing}>
                <span /><span /><span />
              </div>
              {toolActivity && <div style={styles.toolBadge}>{toolActivity}</div>}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div style={styles.suggestions}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} style={styles.suggestion}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={styles.inputArea}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Demandez à Alex de créer un post, analyser une annonce, gérer le calendrier..."
          style={styles.textarea}
          rows={2}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="btn btn-gold"
          style={{ alignSelf: 'flex-end' }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

function isInstagramPost(content) {
  return /instagram/i.test(content) && /#\w+/.test(content);
}

function MessageContent({ content }) {
  const lines = content.split('\n');
  return (
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxWidth: '860px',
    margin: '0 auto',
    padding: '0 24px 24px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 0 20px'
  },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#1a2744' },
  subtitle: { fontSize: '0.85rem', color: '#9aa3bc', marginTop: 2 },
  messages: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingBottom: '16px'
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px'
  },
  avatar: {
    fontSize: '1.5rem',
    flexShrink: 0,
    marginTop: 4
  },
  bubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: '0.93rem'
  },
  aiBubble: {
    background: '#fff',
    border: '1px solid #e2e6f0',
    borderTopLeftRadius: '4px',
    boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
  },
  userBubble: {
    background: '#1a2744',
    color: '#fff',
    borderTopRightRadius: '4px'
  },
  errorBubble: {
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2'
  },
  typing: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
    height: '20px'
  },
  toolBadge: {
    marginTop: '8px',
    fontSize: '0.78rem',
    color: '#9aa3bc',
    fontStyle: 'italic'
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px'
  },
  suggestion: {
    padding: '8px 14px',
    background: '#fff',
    border: '1px solid #e2e6f0',
    borderRadius: '20px',
    fontSize: '0.83rem',
    cursor: 'pointer',
    color: '#1a2744',
    transition: 'all 0.15s'
  },
  pubButton: {
    alignSelf: 'flex-start',
    padding: '7px 14px',
    background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.02em'
  },
  pubForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignSelf: 'flex-start',
    width: '100%'
  },
  pubInput: {
    padding: '7px 10px',
    border: '1px solid #e2e6f0',
    borderRadius: '8px',
    fontSize: '0.83rem',
    outline: 'none',
    fontFamily: 'inherit'
  },
  pubConfirm: {
    alignSelf: 'flex-start',
    padding: '6px 16px',
    background: '#1a2744',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.82rem',
    cursor: 'pointer'
  },
  pubSuccess: {
    fontSize: '0.83rem',
    color: '#2e7d32',
    fontWeight: 600
  },
  pubError: {
    fontSize: '0.78rem',
    color: '#c62828'
  },
  inputArea: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    background: '#fff',
    border: '2px solid #e2e6f0',
    borderRadius: '14px',
    padding: '12px 14px',
    boxShadow: '0 4px 20px rgba(26,39,68,0.08)'
  },
  textarea: {
    flex: 1,
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    fontSize: '0.93rem',
    lineHeight: '1.5',
    background: 'transparent',
    color: '#2d3454'
  }
};

// Typing animation CSS
const styleTag = document.createElement('style');
styleTag.textContent = `
  .typing span {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #9aa3bc;
    animation: bounce 1.2s infinite;
  }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
  }
`;
document.head.appendChild(styleTag);
