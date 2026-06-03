import React, { useState, useRef, useCallback, useId } from 'react';

// ─── Cloudinary config ────────────────────────────────────────────────────────
const CLOUD_NAME       = 'dwqbtroxk';
const UPLOAD_PRESET    = 'monprojetimmo';
const UPLOAD_URL       = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CROP_STEPS       = 'c_fill,w_1080,h_1080';
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

// fl_attachment force Content-Disposition:attachment → download sans CORS.
// L'intensité choisie est intégrée — le fichier téléchargé = aperçu visible.
function buildDownloadUrl(secureUrl, originalName, intensity) {
  const slug = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return secureUrl.replace(
    '/upload/',
    `/upload/fl_attachment:${slug}-optimisee/${enhanceSteps(intensity)}/`
  );
}

// ─── Upload helper ────────────────────────────────────────────────────────────
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
        try { reject(new Error(JSON.parse(xhr.responseText).error?.message || `HTTP ${xhr.status}`)); }
        catch { reject(new Error(`HTTP ${xhr.status}`)); }
      }
    };
    xhr.onerror = () => reject(new Error('Erreur réseau'));
    xhr.open('POST', UPLOAD_URL);
    xhr.send(fd);
  });
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function Thumbnail({ image, isSelected, onClick }) {
  const isUploading = image.status === 'uploading';
  const hasError    = image.status === 'error';
  const isApproved  = image.validation === 'approved';
  const isRejected  = image.validation === 'rejected';

  const borderColor = isSelected ? '#c9a84c'
                    : isApproved ? '#22c55e'
                    : isRejected ? '#ef4444'
                    : '#e2e6f0';

  return (
    <button
      onClick={onClick}
      title={image.name}
      style={{
        ...s.thumb,
        border: `2px solid ${borderColor}`,
        outline: isSelected ? '3px solid rgba(201,168,76,0.25)' : 'none',
        outlineOffset: '2px'
      }}
    >
      {/* Image or placeholder */}
      {image.secureUrl ? (
        <img src={buildBeforeUrl(image.secureUrl)} alt={image.name} style={s.thumbImg} />
      ) : (
        <div style={s.thumbPlaceholder}>
          {isUploading && <span style={{ fontSize: '0.68rem', color: '#9aa3bc', fontWeight: 600 }}>{image.progress}%</span>}
          {hasError    && <span style={{ fontSize: '1.1rem' }}>⚠️</span>}
          {!isUploading && !hasError && <span style={{ fontSize: '1.2rem', color: '#c9a84c' }}>📷</span>}
        </div>
      )}

      {/* Status badge — top-right corner */}
      {isApproved && (
        <span style={{ ...s.thumbBadge, background: '#22c55e' }}>✓</span>
      )}
      {isRejected && (
        <span style={{ ...s.thumbBadge, background: '#ef4444' }}>✕</span>
      )}

      {/* Upload progress — bottom bar */}
      {isUploading && (
        <div style={s.thumbProgressTrack}>
          <div style={{ ...s.thumbProgressBar, width: `${image.progress}%` }} />
        </div>
      )}
    </button>
  );
}

// ─── Big preview + controls (editor layout) ───────────────────────────────────
// key={selectedId} dans le parent force le remontage quand on change d'image,
// ce qui réinitialise view et sliderDisplay à partir des props de la nouvelle image.
function BigPreview({ image, onValidate, onReject, onReset, onIntensityChange }) {
  const [view, setView]               = useState('after');
  const [sliderDisplay, setSliderDisplay] = useState(image.intensity);

  const isUploading = image.status === 'uploading';
  const hasError    = image.status === 'error';
  const isApproved  = image.validation === 'approved';
  const isRejected  = image.validation === 'rejected';

  const beforeUrl  = image.secureUrl ? buildBeforeUrl(image.secureUrl) : null;
  const afterUrl   = image.secureUrl ? buildAfterUrl(image.secureUrl, image.intensity) : null;
  const displayUrl = view === 'before' ? beforeUrl : afterUrl;

  // Pendant le glissement : seul le chiffre change (pas de requête Cloudinary).
  function handleSliderInput(e)  { setSliderDisplay(Number(e.target.value)); }
  // Au relâchement : engage la valeur → reconstruction de l'URL d'aperçu.
  function handleSliderCommit(e) {
    const val = Number(e.target.value);
    setSliderDisplay(val);
    onIntensityChange(val);
  }

  return (
    <div style={s.editorLayout}>

      {/* ── Grande image ───────────────────────────────────────────────────── */}
      <div style={s.previewCol}>
        <div style={s.bigImgWrapper}>
          {image.secureUrl ? (
            <>
              <img
                key={displayUrl}
                src={displayUrl}
                alt={view === 'before' ? 'Avant amélioration' : 'Après amélioration'}
                style={s.bigImg}
                loading="lazy"
              />
              <span style={s.imgLabel}>
                {view === 'before' ? 'Original recadré' : 'Amélioré · 1080×1080'}
              </span>
            </>
          ) : (
            <div style={s.bigImgPlaceholder}>
              {isUploading && (
                <div style={{ textAlign: 'center', width: '60%' }}>
                  <div style={s.progressTrack}>
                    <div style={{ ...s.progressBar, width: `${image.progress}%` }} />
                  </div>
                  <p style={{ ...s.uploadingLabel, marginTop: 8 }}>Upload… {image.progress}%</p>
                </div>
              )}
              {hasError && <p style={{ color: '#b91c1c', fontSize: '0.9rem' }}>⚠ {image.error}</p>}
              {!isUploading && !hasError && (
                <p style={{ color: '#9aa3bc', fontSize: '0.9rem' }}>Sélectionnez une photo</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Panneau de contrôles ───────────────────────────────────────────── */}
      <div style={s.controlsCol}>

        {/* Nom + statut */}
        <div style={s.controlsHeader}>
          <span style={s.controlsFileName} title={image.name}>{image.name}</span>
          {isApproved && <span style={{ ...s.badge, background: '#dcfce7', color: '#15803d' }}>✓ Validée</span>}
          {isRejected && <span style={{ ...s.badge, background: '#fee2e2', color: '#b91c1c' }}>✕ Rejetée</span>}
          {!isApproved && !isRejected && !isUploading && !hasError && (
            <span style={{ ...s.badge, background: '#fef9c3', color: '#854d0e' }}>⏳ En attente</span>
          )}
          {isUploading && (
            <span style={{ ...s.badge, background: '#e0f2fe', color: '#0369a1' }}>⏫ Upload…</span>
          )}
        </div>

        {image.secureUrl && (<>

          {/* Toggle Avant / Après */}
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

          {/* Curseur d'intensité */}
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

          {/*
           * ── Zone réservée : futurs réglages détaillés ─────────────────────
           * Ajouter ici les curseurs luminosité, contraste, saturation, etc.
           * (mini-Lightroom). La zone est prête à accueillir ces contrôles.
           */}
          <div style={s.reservedZone}>
            <span style={s.reservedLabel}>Réglages avancés — bientôt disponibles</span>
          </div>

          {/* Boutons d'action */}
          <div style={s.actionRow}>
            {!isApproved && !isRejected && (
              <>
                <button onClick={onReject} className="btn btn-danger btn-sm">✕ Rejeter</button>
                <button onClick={onValidate} className="btn btn-gold btn-sm" style={{ flex: 1 }}>
                  ✓ Valider
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
                  ⬇ Télécharger
                </a>
                <button onClick={onReset} className="btn btn-outline btn-sm">Modifier</button>
              </>
            )}
            {isRejected && (
              <button onClick={onReset} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                Modifier le choix
              </button>
            )}
          </div>

        </>)}
      </div>

    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PhotoEnhancer() {
  const [images, setImages]       = useState([]);
  const [dragging, setDragging]   = useState(false);
  const [selectedId, setSelectedId] = useState(null);

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
      intensity:  DEFAULT_INTENSITY,
      error:      null
    }));

    // Sélectionner la première nouvelle image si rien n'est encore sélectionné
    setSelectedId(prev => prev ?? newImages[0].id);
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
          // Sélectionner automatiquement dès que la première image est prête
          setSelectedId(prev => prev ?? img.id);
        })
        .catch(err => {
          setImages(prev => prev.map(x =>
            x.id === img.id ? { ...x, status: 'error', error: err.message } : x
          ));
        });
    });
  }

  // ── mutation handlers ─────────────────────────────────────────────────────
  const setValidation = (id, value) =>
    setImages(prev => prev.map(x => x.id === id ? { ...x, validation: value } : x));

  const setIntensity = (id, value) =>
    setImages(prev => prev.map(x => x.id === id ? { ...x, intensity: value } : x));

  // ── derived state ─────────────────────────────────────────────────────────
  const hasAny       = images.length > 0;
  const pendingCount = images.filter(x => x.status === 'uploading').length;
  const selectedImage = images.find(x => x.id === selectedId) ?? images[0] ?? null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Input caché — accessible depuis partout */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      <header style={s.pageHeader}>
        <h1 style={s.title}>Optimiser les photos</h1>
        <p style={s.subtitle}>
          Uploadez, ajustez l'intensité, comparez avant/après, validez, puis téléchargez.
        </p>
      </header>

      {/* ── Grand aperçu + contrôles ── */}
      {hasAny && selectedImage && (
        <BigPreview
          key={selectedImage.id}
          image={selectedImage}
          onValidate={() => setValidation(selectedImage.id, 'approved')}
          onReject={() => setValidation(selectedImage.id, 'rejected')}
          onReset={() => setValidation(selectedImage.id, 'pending')}
          onIntensityChange={(val) => setIntensity(selectedImage.id, val)}
        />
      )}

      {/* ── Bande de vignettes ── */}
      {hasAny && (
        <div style={s.stripSection}>
          <div style={s.stripBar}>
            {/* Bouton Ajouter */}
            <button
              style={{ ...s.thumbAdd, ...(dragging ? s.thumbAddDragging : {}) }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              title="Ajouter des photos"
            >
              <span style={{ fontSize: '1.2rem' }}>+</span>
              {pendingCount > 0
                ? <span style={{ fontSize: '0.65rem', color: '#c9a84c' }}>{pendingCount}</span>
                : <span style={{ fontSize: '0.65rem', color: '#9aa3bc' }}>Ajouter</span>}
            </button>

            {/* Vignettes scrollables */}
            <div style={s.thumbList}>
              {images.map(img => (
                <Thumbnail
                  key={img.id}
                  image={img}
                  isSelected={img.id === (selectedImage?.id)}
                  onClick={() => setSelectedId(img.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Zone de dépôt initiale (aucune image) ── */}
      {!hasAny && (
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
          <span style={s.dropIcon}>{dragging ? '⬇️' : '📷'}</span>
          <p style={s.dropTitle}>{dragging ? 'Relâchez pour uploader' : 'Déposez vos photos ici'}</p>
          <p style={s.dropSub}>ou cliquez pour sélectionner · JPG, PNG, WEBP</p>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  pageHeader: {},
  title:    { fontSize: '1.5rem', fontWeight: 800, color: '#1a2744' },
  subtitle: { fontSize: '0.85rem', color: '#9aa3bc', marginTop: 4 },

  // ── Editor layout ─────────────────────────────────────────────────────────
  editorLayout: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start'
  },

  // Left: big image
  previewCol: {
    flex: 1,
    minWidth: 0
  },
  bigImgWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#1a2744',
    aspectRatio: '1 / 1',
    boxShadow: '0 8px 40px rgba(26,39,68,0.18)'
  },
  bigImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  bigImgPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imgLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    background: 'rgba(26,39,68,0.75)',
    color: '#fff',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 6,
    backdropFilter: 'blur(4px)'
  },

  // Right: controls panel
  controlsCol: {
    width: '260px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  controlsHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  controlsFileName: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#1a2744',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  // Reserved zone for future detailed controls
  reservedZone: {
    borderTop: '1px dashed #e2e6f0',
    paddingTop: '12px',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center'
  },
  reservedLabel: {
    fontSize: '0.72rem',
    color: '#c9d0de',
    fontStyle: 'italic'
  },

  // ── Thumbnail strip ───────────────────────────────────────────────────────
  stripSection: {},
  stripBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#fff',
    borderRadius: '12px',
    padding: '10px',
    boxShadow: '0 2px 12px rgba(26,39,68,0.08)'
  },
  thumbList: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    flex: 1,
    paddingBottom: '2px' // laisse la place à la scrollbar
  },

  // Add button (first item in strip)
  thumbAdd: {
    width: '88px',
    height: '88px',
    flexShrink: 0,
    borderRadius: '8px',
    border: '2px dashed #c9a84c',
    background: '#fffdf5',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    transition: 'all 0.15s',
    color: '#c9a84c',
    fontWeight: 700
  },
  thumbAddDragging: {
    background: '#fef3c7',
    borderColor: '#f59e0b',
    transform: 'scale(1.04)'
  },

  // Individual thumbnail
  thumb: {
    width: '88px',
    height: '88px',
    flexShrink: 0,
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    padding: 0,
    background: '#f0f2f7',
    position: 'relative',
    transition: 'all 0.15s'
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  thumbBadge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
    fontWeight: 700,
    color: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },
  thumbProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'rgba(0,0,0,0.15)'
  },
  thumbProgressBar: {
    height: '100%',
    background: '#c9a84c',
    transition: 'width 0.2s'
  },

  // ── Drop zone (initial, no images) ────────────────────────────────────────
  dropZone: {
    border: '2px dashed #c9a84c',
    borderRadius: '16px',
    background: '#fffdf5',
    padding: '48px 24px',
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

  // ── Shared ────────────────────────────────────────────────────────────────
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 100,
    fontSize: '0.78rem',
    fontWeight: 700,
    flexShrink: 0
  },
  toggleRow: {
    display: 'flex',
    background: '#f0f2f7',
    borderRadius: 8,
    padding: 3,
    gap: 3
  },
  toggleBtn: {
    flex: 1,
    padding: '7px',
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
  actionRow: {
    display: 'flex',
    gap: 8,
    marginTop: 'auto'
  },
  progressTrack: {
    height: 6,
    background: '#e2e6f0',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%'
  },
  progressBar: {
    height: '100%',
    background: '#c9a84c',
    borderRadius: 3,
    transition: 'width 0.2s'
  },
  uploadingLabel: {
    fontSize: '0.8rem',
    color: '#9aa3bc',
    textAlign: 'center'
  }
};
