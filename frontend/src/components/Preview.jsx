import React, { useState } from 'react';

const PLATFORM_PROFILES = {
  Instagram: { handle: '@monprojetimmo', color: '#e1306c', gradient: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', bg: '#fafafa' },
  Facebook: { handle: 'Mon Projet Immo', color: '#1877f2', gradient: '#1877f2', bg: '#f0f2f5' },
  TikTok: { handle: '@monprojetimmo13', color: '#010101', gradient: 'linear-gradient(135deg, #010101, #69c9d0)', bg: '#000' }
};

export default function Preview({ post }) {
  const [selectedPlatform, setSelectedPlatform] = useState(post?.platform || 'Instagram');
  const [customContent, setCustomContent] = useState(post?.content || '');
  const [editing, setEditing] = useState(false);

  const platform = PLATFORM_PROFILES[selectedPlatform];

  const displayContent = customContent || post?.content || '';

  function parseContent(raw) {
    if (!raw) return { caption: '', hashtags: [] };
    const hashtagMatch = raw.match(/#[\wÀ-ſ]+/g) || [];
    const captionPart = raw.replace(/#[\wÀ-ſ]+/g, '').replace(/\n{3,}/g, '\n\n').trim();
    return { caption: captionPart, hashtags: hashtagMatch };
  }

  const { caption, hashtags } = parseContent(displayContent);

  if (!post && !displayContent) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Prévisualisation</h1>
          <p style={styles.subtitle}>Aperçu de vos posts avant publication</p>
        </header>
        <div style={styles.empty}>
          <span style={{ fontSize: '3rem' }}>👁️</span>
          <p style={{ marginTop: '12px', color: '#9aa3bc' }}>
            Générez un post depuis l'onglet <strong>Générateur</strong> pour le prévisualiser ici.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Prévisualisation</h1>
          <p style={styles.subtitle}>{post?.topic || 'Aperçu du post'}</p>
        </div>
      </header>

      <div style={styles.layout}>
        {/* Controls */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <p style={styles.controlLabel}>Plateforme</p>
            <div style={styles.platformRow}>
              {Object.keys(PLATFORM_PROFILES).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  style={{
                    ...styles.platformBtn,
                    ...(selectedPlatform === p ? { background: PLATFORM_PROFILES[p].color, color: '#fff', borderColor: PLATFORM_PROFILES[p].color } : {})
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={styles.controlLabel}>Texte du post</p>
              <button onClick={() => setEditing(!editing)} className="btn btn-outline btn-sm">
                {editing ? 'Fermer' : 'Modifier'}
              </button>
            </div>
            {editing ? (
              <textarea
                className="form-control"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                rows={10}
                style={{ fontSize: '0.85rem' }}
              />
            ) : (
              <div style={styles.rawText}>{displayContent || 'Aucun contenu'}</div>
            )}
          </div>
        </div>

        {/* Phone mockup */}
        <div style={styles.mockupColumn}>
          <div style={styles.phone}>
            <div style={styles.phoneScreen}>
              {selectedPlatform === 'Instagram' && (
                <InstagramPreview platform={platform} caption={caption} hashtags={hashtags} />
              )}
              {selectedPlatform === 'Facebook' && (
                <FacebookPreview platform={platform} caption={caption} />
              )}
              {selectedPlatform === 'TikTok' && (
                <TikTokPreview platform={platform} caption={caption} hashtags={hashtags} />
              )}
            </div>
          </div>
          <p style={styles.mockupNote}>Aperçu indicatif — le rendu final peut varier</p>
        </div>
      </div>
    </div>
  );
}

function InstagramPreview({ platform, caption, hashtags }) {
  return (
    <div style={{ background: '#fafafa', height: '100%', overflowY: 'auto', fontFamily: '-apple-system, sans-serif', fontSize: '13px' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderBottom: '1px solid #efefef' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: platform.gradient, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px' }}>{platform.handle}</div>
          <div style={{ fontSize: '11px', color: '#8e8e8e' }}>Salon-de-Provence</div>
        </div>
      </div>
      {/* Image placeholder */}
      <div style={{ background: 'linear-gradient(135deg, #1a2744, #c9a84c)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '3rem' }}>🏠</span>
      </div>
      {/* Actions */}
      <div style={{ padding: '10px 14px 6px', display: 'flex', gap: '14px', fontSize: '18px' }}>
        <span>♡</span><span>💬</span><span>↗</span>
      </div>
      {/* Caption */}
      <div style={{ padding: '4px 14px 10px' }}>
        <span style={{ fontWeight: 700 }}>monprojetimmo </span>
        <span style={{ color: '#262626', lineHeight: 1.5 }}>{caption}</span>
        {hashtags.length > 0 && (
          <div style={{ marginTop: '6px', color: '#00376b', lineHeight: 1.6 }}>
            {hashtags.join(' ')}
          </div>
        )}
      </div>
    </div>
  );
}

function FacebookPreview({ platform, caption }) {
  return (
    <div style={{ background: '#f0f2f5', height: '100%', overflowY: 'auto', fontFamily: '-apple-system, sans-serif', fontSize: '14px' }}>
      <div style={{ background: '#fff', borderRadius: '8px', margin: '10px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontWeight: 700 }}>Mon Projet Immo</div>
            <div style={{ fontSize: '12px', color: '#65676b' }}>Maintenant · 🌐</div>
          </div>
        </div>
        <div style={{ padding: '0 16px 12px', color: '#050505', lineHeight: 1.6 }}>{caption}</div>
        <div style={{ background: 'linear-gradient(135deg, #1a2744, #c9a84c)', aspectRatio: '1.91', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '3rem' }}>🏠</span>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e4e6ea', display: 'flex', gap: '20px', color: '#65676b', fontSize: '13px' }}>
          <span>👍 J'aime</span><span>💬 Commenter</span><span>↗ Partager</span>
        </div>
      </div>
    </div>
  );
}

function TikTokPreview({ platform, caption, hashtags }) {
  return (
    <div style={{ background: '#000', height: '100%', overflowY: 'auto', fontFamily: '-apple-system, sans-serif', color: '#fff', position: 'relative' }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, rgba(0,0,0,0.7) 70%)', minHeight: '100%', padding: '0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '4rem' }}>🏠</span>
        </div>
        <div style={{ position: 'relative', padding: '20px 12px 20px', zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{platform.handle}</div>
          <div style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '6px' }}>{caption}</div>
          {hashtags.length > 0 && (
            <div style={{ fontSize: '13px', color: '#a0c4ff' }}>{hashtags.slice(0, 5).join(' ')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#1a2744' },
  subtitle: { fontSize: '0.85rem', color: '#9aa3bc', marginTop: 2 },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 24px',
    textAlign: 'center'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '24px',
    alignItems: 'start'
  },
  controlLabel: { fontSize: '0.8rem', fontWeight: 700, color: '#9aa3bc', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' },
  platformRow: { display: 'flex', gap: '8px' },
  platformBtn: {
    flex: 1,
    padding: '8px',
    border: '2px solid #e2e6f0',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.82rem',
    transition: 'all 0.15s'
  },
  rawText: {
    fontSize: '0.83rem',
    color: '#5a6380',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
    maxHeight: '220px',
    overflowY: 'auto'
  },
  mockupColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  phone: {
    width: '280px',
    height: '560px',
    border: '10px solid #1a2744',
    borderRadius: '40px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(26,39,68,0.3)',
    position: 'relative'
  },
  phoneScreen: { width: '100%', height: '100%', overflow: 'hidden' },
  mockupNote: { marginTop: '12px', fontSize: '0.75rem', color: '#9aa3bc', textAlign: 'center' }
};
