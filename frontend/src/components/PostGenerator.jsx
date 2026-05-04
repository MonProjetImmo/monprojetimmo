import React, { useState } from 'react';
import { postsAPI } from '../api/index.js';

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok'];
const CONTENT_TYPES = [
  'Annonce bien',
  'Conseil achat',
  'Actualité locale',
  'Actualité marché',
  'Post engagement',
  'Témoignage client',
  'Découverte quartier',
  'Avant/Après rénovation'
];
const TONES = ['Professionnel et chaleureux', 'Enthousiaste', 'Informatif', 'Storytelling', 'Inspirant'];

const PLATFORM_COLORS = {
  Instagram: '#e1306c',
  Facebook: '#1877f2',
  TikTok: '#010101'
};

export default function PostGenerator({ onPreview }) {
  const [form, setForm] = useState({
    platform: 'Instagram',
    contentType: 'Annonce bien',
    topic: '',
    tone: 'Professionnel et chaleureux',
    details: ''
  });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.topic.trim()) return;
    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await postsAPI.generate({
        platform: form.platform,
        contentType: form.contentType,
        topic: form.topic,
        tone: form.tone,
        details: form.details
      });
      setResult(res.data.response);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Générateur de posts</h1>
        <p style={styles.subtitle}>Créez du contenu optimisé pour chaque plateforme</p>
      </header>

      <div style={styles.grid}>
        {/* Form */}
        <div className="card">
          <form onSubmit={handleGenerate}>
            <div style={styles.platformRow}>
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateForm('platform', p)}
                  style={{
                    ...styles.platformBtn,
                    ...(form.platform === p ? { background: PLATFORM_COLORS[p], color: '#fff', borderColor: PLATFORM_COLORS[p] } : {})
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label>Type de contenu</label>
              <select
                className="form-control"
                value={form.contentType}
                onChange={(e) => updateForm('contentType', e.target.value)}
              >
                {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Sujet *</label>
              <input
                type="text"
                className="form-control"
                value={form.topic}
                onChange={(e) => updateForm('topic', e.target.value)}
                placeholder="Ex: Villa 5 pièces avec piscine à Salon, 450 000€"
                required
              />
            </div>

            <div className="form-group">
              <label>Ton</label>
              <select
                className="form-control"
                value={form.tone}
                onChange={(e) => updateForm('tone', e.target.value)}
              >
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Détails supplémentaires</label>
              <textarea
                className="form-control"
                value={form.details}
                onChange={(e) => updateForm('details', e.target.value)}
                placeholder="Surface, nombre de pièces, quartier, caractéristiques, prix..."
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="btn btn-gold"
              disabled={loading || !form.topic.trim()}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Génération en cours...' : `Générer pour ${form.platform}`}
            </button>
          </form>
        </div>

        {/* Result */}
        <div style={styles.resultColumn}>
          {error && (
            <div style={styles.error}>{error}</div>
          )}

          {loading && (
            <div className="card" style={styles.loadingCard}>
              <div style={styles.loadingDot} />
              <p style={{ color: '#9aa3bc', marginTop: 16 }}>Alex rédige votre post...</p>
            </div>
          )}

          {result && !loading && (
            <div className="card">
              <div style={styles.resultHeader}>
                <span style={{ ...styles.platformTag, background: PLATFORM_COLORS[form.platform] }}>
                  {form.platform}
                </span>
                <div style={styles.resultActions}>
                  <button
                    onClick={copyToClipboard}
                    className="btn btn-outline btn-sm"
                  >
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                  {onPreview && (
                    <button
                      onClick={() => onPreview({ platform: form.platform, content: result, topic: form.topic })}
                      className="btn btn-primary btn-sm"
                    >
                      Prévisualiser
                    </button>
                  )}
                </div>
              </div>
              <pre style={styles.resultText}>{result}</pre>
            </div>
          )}

          {!result && !loading && !error && (
            <div style={styles.placeholder}>
              <span style={styles.placeholderIcon}>✍️</span>
              <p>Votre post apparaîtra ici</p>
              <p style={{ fontSize: '0.82rem', color: '#9aa3bc', marginTop: 4 }}>
                Remplissez le formulaire et cliquez sur Générer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  header: { marginBottom: '24px' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#1a2744' },
  subtitle: { fontSize: '0.85rem', color: '#9aa3bc', marginTop: 2 },
  grid: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '24px',
    alignItems: 'start'
  },
  platformRow: { display: 'flex', gap: '8px', marginBottom: '20px' },
  platformBtn: {
    flex: 1,
    padding: '9px',
    border: '2px solid #e2e6f0',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.88rem',
    transition: 'all 0.15s'
  },
  resultColumn: { display: 'flex', flexDirection: 'column', gap: '16px' },
  resultHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  platformTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 700
  },
  resultActions: { display: 'flex', gap: '8px' },
  resultText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    lineHeight: 1.7,
    color: '#2d3454'
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '0.88rem'
  },
  loadingCard: { textAlign: 'center', padding: '40px 24px' },
  loadingDot: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e6f0',
    borderTopColor: '#c9a84c',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.8s linear infinite'
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    color: '#9aa3bc',
    textAlign: 'center'
  },
  placeholderIcon: { fontSize: '3rem', marginBottom: '12px' }
};

const spinStyle = document.createElement('style');
spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(spinStyle);
