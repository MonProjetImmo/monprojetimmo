import React, { useState, useRef, useCallback, useId } from 'react';

// ─── Cloudinary config ────────────────────────────────────────────────────────
const CLOUD_NAME      = 'dwqbtroxk';
const UPLOAD_PRESET   = 'monprojetimmo';
const UPLOAD_URL      = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CROP_STEPS      = 'c_fill,w_1080,h_1080';
const DEFAULT_INTENSITY = 50; // blend e_improve (0 = aucun effet, 100 = max)

// Chaîne d'amélioration paramétrée par l'intensité (blend d'e_improve:indoor)
function enhanceSteps(intensity) {
  return `e_improve:indoor:${intensity}/c_fill,w_1080,h_1080,q_auto`;
}

function insertTransform(secureUrl, transform) {
  return secureUrl.replace('/upload/', `/upload/${transform}/`);
}

function buildBeforeUrl(secureUrl) {
  return insertTransform(secureUrl, CROP_STEPS);
}

function buildAfterUrl(secureUrl, intensity) {
  return insertTransform(secureUrl, enhanceSteps(intensity));
}

// Construit l'URL de téléchargement : fl_attachment force le Content-Disposition
// "attachment" côté Cloudinary, ce qui déclenche le download sans problème CORS.
// Le nom dans fl_attachment:slug est utilisé par Cloudinary comme nom de fichier.
// L'intensité choisie est intégrée dans la chaîne — le fichier téléchargé correspond
// exactement à ce que l'utilisateur voit à l'écran.
function buildDownloadUrl(secureUrl, originalName, intensity) {
  const slug = originalName
    .replace(/\.[^/.]+$/, '')          // retire l'extension
    .replace(/[^a-zA-Z0-9]+/g, '-')   // remplace tout ce qui n'est pas alphanum
    .replace(/^-+|-+$/g, '')           // trim les tirets en début/fin
    .toLowerCase();
  const dlName = `${slug}-optimisee`;
  return secureUrl.replace('/upload/', `/upload/fl_attachment:${dlName}/${enhanceSteps(intensity)}/`);
}

// ─── Upload helpers ───────────────────────────────────────────────────────────
function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Erreur réseau'));
    xhr.open('POST', UPLOAD_URL);
    xhr.send(fd);
  });
}

// ─── Single image card ─────────────────────────────────────────────────────
function ImageCard({ image, onValidate, onReject, onReset, onIntensityChange }) {
  const [view, setView] = useState('after');
  // sliderDisplay suit le pouce en temps réel (affichage uniquement).
  // image.intensity est la valeur engagée, utilisée pour construire l'URL.
  const [sliderDisplay, setSliderDisplay] = useState(image.intensity);

  const beforeUrl  = image.secureUrl ? buildBeforeUrl(image.secureUrl) : null;
  // afterUrl est recalculée à partir de image.intensity (valeur engagée, pas sliderDisplay)
  const afterUrl   = image.secureUrl ? buildAfterUrl(image.secureUrl, image.intensity) : null;
  const displayUrl = view === 'before' ? beforeUrl : afterUrl;

  const isUploading = image.status === 'uploading';
  const hasError    = image.status === 'error';
  const isApproved  = image.validation === 'approved';
  const isRejected  = image.validation === 'rejected';

  // Pendant le glissement : met à jour l'affichage du chiffre uniquement,
  // sans reconstruire l'URL (pas de requête Cloudinary à chaque pixel).
  function handleSliderInput(e) {
    setSliderDisplay(Number(e.target.value));
  }

  // Au relâchement : engage la valeur → déclenche la reconstruction de l'URL
  // et donc le rechargement de l'aperçu.
  function handleSliderCommit(e) {
    const val = Number(e.target.value);
    setSliderDisplay(val);
    onIntensityChange(val);
  }

  return (
    <div style={{
      ...s.card,
      border: isApproved ? '2px solid #22c55e'
            : isRejected ? '2px solid #ef4444'
            : '2px solid #e2e6f0'
    }}>
      {/* Header */}
      <div style={s.cardHeader}>
        <span style={s.fileName}>{image.name}</span>
        {isApproved && <span style={{ ...s.badge, background: '#dcfce7', color: '#15803d' }}>✓ Validée</span>}
        {isRejected && <span style={{ ...s.badge, background: '#fee2e2', color: '#b91c1c' }}>✕ Rejetée</span>}
        {!isApproved && !isRejected && !isUploading && !hasError && (
          <span style={{ ...s.badge, background: '#fef9c3', color: '#854d0e' }}>⏳ En attente</span>
        )}
      </div>

      {/* Uploading state */}
      {isUploading && (
        <div style={s.uploadingBlock}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressBar, width: `${image.progress}%` }} />
          </div>
          <p style={s.uploadingLabel}>Chargement… {image.progress}%</p>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div style={s.errorBlock}>
          <p style={{ color: '#b91c1c', fontSize: '0.88rem' }}>⚠ {image.error}</p>
        </div>
      )}

      {/* Before / After toggle + image + curseur */}
      {image.secureUrl && (
        <>
          <div style={s.toggleRow}>
            <button
              style={{ ...s.toggleBtn, ...(view === 'before' ? s.toggleBtnActive : {}) }}
              onClick={() => setView('before')}
            >
              Avant
            </button>
            <button
              style={{ ...s.toggleBtn, ...(view === 'after' ? s.toggleBtnActive : {}) }}
              onClick={() => setView('after')}
            >
              Après ✨
            </button>
          </div>

          <div style={s.imgWrapper}>
            <img
              key={displayUrl}
              src={displayUrl}
              alt={view === 'before' ? 'Avant amélioration' : 'Après amélioration'}
              style={s.img}
              loading="lazy"
            />
            <span style={s.imgLabel}>{view === 'before' ? 'Original recadré' : 'Amélioré · 1080×1080'}</span>
          </div>

          {/* Curseur d'intensité — visible quelle que soit la vue */}
          <div style={s.sliderRow}>
            <span style={s.sliderLabel}>Intensité</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderDisplay}
              onChange={handleSliderInput}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
              style={s.slider}
              aria-label="Intensité de l'amélioration"
            />
            <span style={s.sliderValue}>{sliderDisplay}</span>
          </div>

          {/* Action buttons */}
          <div style={s.actionRow}>
            {!isApproved && !isRejected && (
              <>
                <button onClick={onReject} className="btn btn-danger btn-sm">✕ Rejeter</button>
                <button onClick={onValidate} className="btn btn-gold btn-sm" style={{ flex: 1 }}>
                  ✓ Valider cette image
                </button>
              </>
            )}
            {isApproved && (
              <>
                <a
                  href={buildDownloadUrl(image.secureUrl, image.name, image.intensity)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ⬇ Télécharger optimisée
                </a>
                <button onClick={onReset} className="btn btn-outline btn-sm">
                  Modifier
                </button>
              </>
            )}
            {isRejected && (
              <button onClick={onReset} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                Modifier le choix
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PhotoEnhancer() {
  const [images, setImages] = useState([]);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef(null);
  const dropZoneId   = useId();

  // ── drag & drop ──────────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);
  const handleDrop      = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) addFiles(files);
  }, []);

  // ── file picker ──────────────────────────────────────────────────────────
  function handleFileInput(e) {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length) addFiles(files);
    e.target.value = '';
  }

  // ── add + upload ─────────────────────────────────────────────────────────
  function addFiles(files) {
    const newImages = files.map(file => ({
      id:         crypto.randomUUID(),
      name:       file.name,
      status:     'uploading',
      progress:   0,
      secureUrl:  null,
      validation: 'pending',
      intensity:  DEFAULT_INTENSITY, // intensité initiale par image
      error:      null
    }));

    setImages(prev => [...prev, ...newImages]);

    newImages.forEach((img, i) => {
      uploadToCloudinary(files[i], (pct) => {
        setImages(prev => prev.map(x => x.id === img.id ? { ...x, progress: pct } : x));
      })
        .then(data => {
          setImages(prev => prev.map(x =>
            x.id === img.id
              ? { ...x, status: 'ready', progress: 100, secureUrl: data.secure_url }
              : x
          ));
        })
        .catch(err => {
          setImages(prev => prev.map(x =>
            x.id === img.id
              ? { ...x, status: 'error', error: err.message }
              : x
          ));
        });
    });
  }

  // ── validation ────────────────────────────────────────────────────────────
  const setValidation = (id, value) =>
    setImages(prev => prev.map(x => x.id === id ? { ...x, validation: value } : x));

  // ── intensité par image (engagée au relâchement du curseur) ───────────────
  const setIntensity = (id, value) =>
    setImages(prev => prev.map(x => x.id === id ? { ...x, intensity: value } : x));

  // ── derived state ─────────────────────────────────────────────────────────
  const pendingCount = images.filter(x => x.status === 'uploading').length;
  const hasAny       = images.length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <header style={s.pageHeader}>
        <h1 style={s.title}>Optimiser les photos</h1>
        <p style={s.subtitle}>
          Uploadez, comparez avant/après, ajustez l'intensité, validez, puis téléchargez.
        </p>
      </header>

      {/* ── Drop zone ── */}
      <div
        id={dropZoneId}
        style={{ ...s.dropZone, ...(dragging ? s.dropZoneDragging : {}) }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Zone de dépôt de photos"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <span style={s.dropIcon}>{dragging ? '⬇️' : '📷'}</span>
        <p style={s.dropTitle}>{dragging ? 'Relâchez pour uploader' : 'Déposez vos photos ici'}</p>
        <p style={s.dropSub}>ou cliquez pour sélectionner · JPG, PNG, WEBP</p>
        {pendingCount > 0 && (
          <p style={{ ...s.dropSub, color: '#c9a84c', marginTop: 4 }}>
            {pendingCount} image{pendingCount > 1 ? 's' : ''} en cours d'upload…
          </p>
        )}
      </div>

      {/* ── Review grid ── */}
      {hasAny && (
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>
              Aperçu avant/après
              <span style={s.countBadge}>{images.length}</span>
            </h2>
            <p style={s.sectionSub}>
              Ajustez l'intensité, basculez Avant/Après pour comparer, puis validez ou rejetez.
            </p>
          </div>

          <div style={s.grid}>
            {images.map(img => (
              <ImageCard
                key={img.id}
                image={img}
                onValidate={() => setValidation(img.id, 'approved')}
                onReject={() => setValidation(img.id, 'rejected')}
                onReset={() => setValidation(img.id, 'pending')}
                onIntensityChange={(val) => setIntensity(img.id, val)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  },
  pageHeader: {},
  title:    { fontSize: '1.5rem', fontWeight: 800, color: '#1a2744' },
  subtitle: { fontSize: '0.85rem', color: '#9aa3bc', marginTop: 4 },

  // Drop zone
  dropZone: {
    border: '2px dashed #c9a84c',
    borderRadius: '16px',
    background: '#fffdf5',
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    userSelect: 'none'
  },
  dropZoneDragging: {
    background: '#fef3c7',
    borderColor: '#f59e0b',
    transform: 'scale(1.01)'
  },
  dropIcon:  { fontSize: '2.5rem' },
  dropTitle: { fontWeight: 700, color: '#1a2744', marginTop: 8, fontSize: '1rem' },
  dropSub:   { fontSize: '0.82rem', color: '#9aa3bc', marginTop: 4 },

  // Section
  section: {},
  sectionHeader: { marginBottom: '16px' },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1a2744',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  sectionSub: { fontSize: '0.82rem', color: '#9aa3bc', marginTop: 4 },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    background: '#e2e6f0',
    color: '#5a6380',
    fontSize: '0.78rem',
    fontWeight: 700,
    padding: '0 8px'
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '20px'
  },

  // Card
  card: {
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 24px rgba(26,39,68,0.08)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'border-color 0.2s'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  fileName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#5a6380',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '60%'
  },
  badge: {
    padding: '3px 10px',
    borderRadius: 100,
    fontSize: '0.78rem',
    fontWeight: 700,
    flexShrink: 0
  },

  // Upload progress
  uploadingBlock: { padding: '12px 0' },
  progressTrack: {
    height: 6,
    background: '#e2e6f0',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    background: '#c9a84c',
    borderRadius: 3,
    transition: 'width 0.2s'
  },
  uploadingLabel: { fontSize: '0.8rem', color: '#9aa3bc', marginTop: 6, textAlign: 'center' },
  errorBlock: {
    padding: '10px 12px',
    background: '#fee2e2',
    borderRadius: 8
  },

  // Toggle
  toggleRow: {
    display: 'flex',
    background: '#f0f2f7',
    borderRadius: 8,
    padding: 3,
    gap: 3
  },
  toggleBtn: {
    flex: 1,
    padding: '6px',
    border: 'none',
    background: 'transparent',
    borderRadius: 6,
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#9aa3bc',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  toggleBtnActive: {
    background: '#fff',
    color: '#1a2744',
    boxShadow: '0 1px 4px rgba(26,39,68,0.10)'
  },

  // Image display
  imgWrapper: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#f0f2f7',
    aspectRatio: '1 / 1'
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  imgLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    background: 'rgba(26,39,68,0.7)',
    color: '#fff',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6
  },

  // Intensity slider
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  sliderLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#9aa3bc',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    flexShrink: 0
  },
  slider: {
    flex: 1,
    accentColor: '#c9a84c',
    cursor: 'pointer',
    height: 4
  },
  sliderValue: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#1a2744',
    minWidth: 24,
    textAlign: 'right'
  },

  // Action row
  actionRow: {
    display: 'flex',
    gap: 8
  }
};
