import React, { useState, useRef, useCallback, useId } from 'react';

// ─── Cloudinary config ────────────────────────────────────────────────────────
const CLOUD_NAME        = 'dwqbtroxk';
const UPLOAD_PRESET     = 'monprojetimmo';
const UPLOAD_URL        = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CROP_STEPS        = 'c_fill,w_1080,h_1080';
const DEFAULT_INTENSITY = 50;

// Valeurs par défaut pour les réglages manuels (0 = pas d'effet, ne génère pas de param URL)
const DEFAULT_MANUAL = { brightness: 0, contrast: 0, saturation: 0, sharpen: 0, temperature: 0 };

// Définition des 5 curseurs manuels
const MANUAL_SLIDERS = [
  { key: 'brightness',  label: 'Luminosité',  min: -100, max: 100 },
  { key: 'contrast',    label: 'Contraste',   min: -100, max: 100 },
  { key: 'saturation',  label: 'Saturation',  min: -100, max: 100 },
  { key: 'sharpen',     label: 'Netteté',     min: 0,    max: 100 },
  { key: 'temperature', label: 'Température', min: -100, max: 100 },
];

// ─── Cloudinary URL builders ──────────────────────────────────────────────────

// Construit la chaîne de transformation selon le mode de la photo.
// Mode auto : e_improve:indoor (correction auto) + intensité.
// Mode manuel : uniquement les effets manuels activés (≠ 0), SANS e_improve.
// Température : simulée par e_red/<v>/e_blue/<-v> (pas d'e_temperature chez Cloudinary).
// Un réglage à 0 est omis → chaîne propre.
function buildSteps(image) {
  if (image.mode === 'manual') {
    const fx = [];
    if (image.brightness)  fx.push(`e_brightness:${image.brightness}`);
    if (image.contrast)    fx.push(`e_contrast:${image.contrast}`);
    if (image.saturation)  fx.push(`e_saturation:${image.saturation}`);
    if (image.sharpen)     fx.push(`e_sharpen:${image.sharpen}`);
    if (image.temperature) fx.push(`e_red:${image.temperature}/e_blue:${-image.temperature}`);
    const chain = fx.length ? fx.join('/') + '/' : '';
    return `${chain}c_fill,w_1080,h_1080,q_auto`;
  }
  return `e_improve:indoor:${image.intensity}/c_fill,w_1080,h_1080,q_auto`;
}

function insertTransform(secureUrl, transform) {
  return secureUrl.replace('/upload/', `/upload/${transform}/`);
}

function buildBeforeUrl(secureUrl) {
  return insertTransform(secureUrl, CROP_STEPS);
}

// Aperçu "Après" : utilise buildSteps pour refléter exactement le mode + réglages.
function buildAfterUrl(secureUrl, image) {
  return insertTransform(secureUrl, buildSteps(image));
}

// fl_attachment force Content-Disposition:attachment → download sans CORS.
// Le fichier téléchargé correspond exactement à l'aperçu visible.
function buildDownloadUrl(secureUrl, originalName, image) {
  const slug = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return secureUrl.replace(
    '/upload/',
    `/upload/fl_attachment:${slug}-optimisee/${buildSteps(image)}/`
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
      {image.secureUrl ? (
        <img src={buildBeforeUrl(image.secureUrl)} alt={image.name} style={s.thumbImg} />
      ) : (
        <div style={s.thumbPlaceholder}>
          {isUploading && <span style={{ fontSize: '0.68rem', color: '#9aa3bc', fontWeight: 600 }}>{image.progress}%</span>}
          {hasError    && <span style={{ fontSize: '1.1rem' }}>⚠️</span>}
          {!isUploading && !hasError && <span style={{ fontSize: '1.2rem', color: '#c9a84c' }}>📷</span>}
        </div>
      )}
      {isApproved && <span style={{ ...s.thumbBadge, background: '#22c55e' }}>✓</span>}
      {isRejected && <span style={{ ...s.thumbBadge, background: '#ef4444' }}>✕</span>}
      {isUploading && (
        <div style={s.thumbProgressTrack}>
          <div style={{ ...s.thumbProgressBar, width: `${image.progress}%` }} />
        </div>
      )}
    </button>
  );
}

// ─── BigPreview ───────────────────────────────────────────────────────────────
// key={selectedId} dans le parent force le remontage quand on change d'image,
// réinitialisant tous les états locaux à partir des props de la nouvelle image.
function BigPreview({ image, onValidate, onReject, onReset,
                      onIntensityChange, onModeChange, onManualChange }) {
  const [view, setView]                   = useState('after');
  const [sliderDisplay, setSliderDisplay] = useState(image.intensity);
  // manualDisplay = valeurs affichées en temps réel pendant le glissement.
  // image.* = valeurs engagées, utilisées pour construire l'URL (après relâchement).
  const [manualDisplay, setManualDisplay] = useState({ ...DEFAULT_MANUAL, ...{
    brightness:  image.brightness,
    contrast:    image.contrast,
    saturation:  image.saturation,
    sharpen:     image.sharpen,
    temperature: image.temperature,
  }});

  const isUploading = image.status === 'uploading';
  const hasError    = image.status === 'error';
  const isApproved  = image.validation === 'approved';
  const isRejected  = image.validation === 'rejected';

  const beforeUrl  = image.secureUrl ? buildBeforeUrl(image.secureUrl) : null;
  const afterUrl   = image.secureUrl ? buildAfterUrl(image.secureUrl, image) : null;
  const displayUrl = view === 'before' ? beforeUrl : afterUrl;

  // ── Auto mode handlers ──────────────────────────────────────────────────
  function handleIntensityInput(e)  { setSliderDisplay(Number(e.target.value)); }
  function handleIntensityCommit(e) {
    const val = Number(e.target.value);
    setSliderDisplay(val);
    onIntensityChange(val);
  }

  // ── Manual mode handlers ────────────────────────────────────────────────
  // Pendant le glissement : affichage uniquement, pas de requête Cloudinary.
  function handleManualInput(key, val) {
    setManualDisplay(prev => ({ ...prev, [key]: val }));
  }
  // Au relâchement : engage → reconstruction URL → rechargement aperçu.
  function handleManualCommit(key, val) {
    setManualDisplay(prev => ({ ...prev, [key]: val }));
    onManualChange({ [key]: val });
  }
  // Réinitialiser tous les curseurs manuels à 0.
  function handleManualReset() {
    setManualDisplay({ ...DEFAULT_MANUAL });
    onManualChange({ ...DEFAULT_MANUAL });
  }

  return (
    <div style={s.editorLayout}>

      {/* ── Grande image ───────────────────────────────────────────────── */}
      <div style={s.previewCol}>
        <div style={s.bigImgWrapper}>
          {image.secureUrl ? (
            <>
              <img
                key={displayUrl}
                src={displayUrl}
                alt={view === 'before' ? 'Avant' : 'Après'}
                style={s.bigImg}
                loading="lazy"
              />
              <span style={s.imgLabel}>
                {view === 'before' ? 'Original recadré' : 'Optimisé · 1080×1080'}
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
              {!isUploading && !hasError && <p style={{ color: '#9aa3bc', fontSize: '0.9rem' }}>Sélectionnez une photo</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Panneau de contrôles ───────────────────────────────────────── */}
      <div style={s.controlsCol}>

        {/* Nom + statut */}
        <div style={s.controlsHeader}>
          <span style={s.controlsFileName} title={image.name}>{image.name}</span>
          {isApproved  && <span style={{ ...s.badge, background: '#dcfce7', color: '#15803d' }}>✓ Validée</span>}
          {isRejected  && <span style={{ ...s.badge, background: '#fee2e2', color: '#b91c1c' }}>✕ Rejetée</span>}
          {!isApproved && !isRejected && !isUploading && !hasError &&
            <span style={{ ...s.badge, background: '#fef9c3', color: '#854d0e' }}>⏳ En attente</span>}
          {isUploading &&
            <span style={{ ...s.badge, background: '#e0f2fe', color: '#0369a1' }}>⏫ Upload…</span>}
        </div>

        {image.secureUrl && (<>

          {/* Toggle Avant / Après */}
          <div style={s.toggleRow}>
            <button style={{ ...s.toggleBtn, ...(view === 'before' ? s.toggleBtnActive : {}) }}
              onClick={() => setView('before')}>Avant</button>
            <button style={{ ...s.toggleBtn, ...(view === 'after' ? s.toggleBtnActive : {}) }}
              onClick={() => setView('after')}>Après ✨</button>
          </div>

          {/* ── Sélecteur de mode : Auto / Manuel ── */}
          <div>
            <p style={s.sectionLabel}>Mode</p>
            <div style={s.toggleRow}>
              <button
                style={{ ...s.toggleBtn, ...(image.mode === 'auto' ? s.toggleBtnActive : {}) }}
                onClick={() => onModeChange('auto')}
              >
                ✨ Auto
              </button>
              <button
                style={{ ...s.toggleBtn, ...(image.mode === 'manual' ? s.toggleBtnActive : {}) }}
                onClick={() => onModeChange('manual')}
              >
                ⚙ Manuel
              </button>
            </div>
          </div>

          {/* ── Contrôles selon le mode ── */}
          {image.mode === 'auto' && (
            <div>
              <p style={s.sectionLabel}>Intensité</p>
              <div style={s.sliderRow}>
                <input
                  type="range" min="0" max="100"
                  value={sliderDisplay}
                  onChange={handleIntensityInput}
                  onMouseUp={handleIntensityCommit}
                  onTouchEnd={handleIntensityCommit}
                  style={s.slider}
                  aria-label="Intensité de l'amélioration"
                />
                <span style={s.sliderValue}>{sliderDisplay}</span>
              </div>
            </div>
          )}

          {image.mode === 'manual' && (
            <div style={s.manualSection}>
              {MANUAL_SLIDERS.map(({ key, label, min, max }) => (
                <div key={key} style={s.manualSliderRow}>
                  <span style={s.manualLabel}>{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={manualDisplay[key]}
                    onChange={(e) => handleManualInput(key, Number(e.target.value))}
                    onMouseUp={(e) => handleManualCommit(key, Number(e.target.value))}
                    onTouchEnd={(e) => handleManualCommit(key, Number(e.target.value))}
                    style={s.slider}
                    aria-label={label}
                  />
                  <span style={s.sliderValue}>{manualDisplay[key]}</span>
                </div>
              ))}
              <button
                onClick={handleManualReset}
                className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                Réinitialiser
              </button>
            </div>
          )}

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
                  href={buildDownloadUrl(image.secureUrl, image.name, image)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                  target="_blank" rel="noopener noreferrer"
                >
                  ⬇ Télécharger
                </a>
                <button onClick={onReset} className="btn btn-outline btn-sm">Modifier</button>
              </>
            )}
            {isRejected && (
              <button onClick={onReset} className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}>
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
  const [images, setImages]         = useState([]);
  const [dragging, setDragging]     = useState(false);
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
      id:          crypto.randomUUID(),
      name:        file.name,
      status:      'uploading',
      progress:    0,
      secureUrl:   null,
      validation:  'pending',
      mode:        'auto',
      intensity:   DEFAULT_INTENSITY,
      ...DEFAULT_MANUAL,   // brightness: 0, contrast: 0, saturation: 0, sharpen: 0, temperature: 0
      error:       null
    }));

    setSelectedId(prev => prev ?? newImages[0].id);
    setImages(prev => [...prev, ...newImages]);

    newImages.forEach((img, i) => {
      uploadToCloudinary(files[i], (pct) => {
        setImages(prev => prev.map(x => x.id === img.id ? { ...x, progress: pct } : x));
      })
        .then(data => {
          setImages(prev => prev.map(x =>
            x.id === img.id ? { ...x, status: 'ready', progress: 100, secureUrl: data.secure_url } : x
          ));
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

  const setMode = (id, mode) =>
    setImages(prev => prev.map(x => x.id === id ? { ...x, mode } : x));

  // Accepte des mises à jour partielles (ex. { brightness: 30 } ou { ...DEFAULT_MANUAL })
  const setManualSettings = (id, updates) =>
    setImages(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));

  // ── derived state ─────────────────────────────────────────────────────────
  const hasAny        = images.length > 0;
  const pendingCount  = images.filter(x => x.status === 'uploading').length;
  const selectedImage = images.find(x => x.id === selectedId) ?? images[0] ?? null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple
        style={{ display: 'none' }} onChange={handleFileInput} />

      <header style={s.pageHeader}>
        <h1 style={s.title}>Optimiser les photos</h1>
        <p style={s.subtitle}>
          Uploadez, choisissez le mode (Auto ou Manuel), ajustez, validez, puis téléchargez.
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
          onModeChange={(mode) => setMode(selectedImage.id, mode)}
          onManualChange={(updates) => setManualSettings(selectedImage.id, updates)}
        />
      )}

      {/* ── Bande de vignettes ── */}
      {hasAny && (
        <div style={s.stripSection}>
          <div style={s.stripBar}>
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
            <div style={s.thumbList}>
              {images.map(img => (
                <Thumbnail
                  key={img.id}
                  image={img}
                  isSelected={img.id === selectedImage?.id}
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
          role="button" tabIndex={0} aria-label="Zone de dépôt de photos"
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

  // ── Editor layout ──────────────────────────────────────────────────────────
  editorLayout: { display: 'flex', gap: '20px', alignItems: 'flex-start' },

  previewCol: { flex: 1, minWidth: 0 },
  bigImgWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#1a2744',
    aspectRatio: '1 / 1',
    boxShadow: '0 8px 40px rgba(26,39,68,0.18)'
  },
  bigImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  bigImgPlaceholder: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  imgLabel: {
    position: 'absolute', bottom: 10, left: 10,
    background: 'rgba(26,39,68,0.75)', color: '#fff',
    fontSize: '0.72rem', fontWeight: 600,
    padding: '3px 10px', borderRadius: 6, backdropFilter: 'blur(4px)'
  },

  controlsCol: {
    width: '260px', flexShrink: 0,
    display: 'flex', flexDirection: 'column', gap: '14px'
  },
  controlsHeader: { display: 'flex', flexDirection: 'column', gap: 6 },
  controlsFileName: {
    fontSize: '0.85rem', fontWeight: 700, color: '#1a2744',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
  },

  // Section label (petit titre au-dessus d'un groupe de contrôles)
  sectionLabel: {
    fontSize: '0.72rem', fontWeight: 600, color: '#9aa3bc',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '6px'
  },

  // ── Manual mode controls ───────────────────────────────────────────────────
  manualSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  manualSliderRow: { display: 'flex', alignItems: 'center', gap: 8 },
  manualLabel: {
    fontSize: '0.75rem', fontWeight: 600, color: '#5a6380',
    width: '72px', flexShrink: 0
  },

  // ── Thumbnail strip ────────────────────────────────────────────────────────
  stripSection: {},
  stripBar: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#fff', borderRadius: '12px', padding: '10px',
    boxShadow: '0 2px 12px rgba(26,39,68,0.08)'
  },
  thumbList: {
    display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '2px'
  },
  thumbAdd: {
    width: '88px', height: '88px', flexShrink: 0,
    borderRadius: '8px', border: '2px dashed #c9a84c',
    background: '#fffdf5', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 2,
    transition: 'all 0.15s', color: '#c9a84c', fontWeight: 700
  },
  thumbAddDragging: { background: '#fef3c7', borderColor: '#f59e0b', transform: 'scale(1.04)' },
  thumb: {
    width: '88px', height: '88px', flexShrink: 0,
    borderRadius: '8px', overflow: 'hidden',
    cursor: 'pointer', padding: 0, background: '#f0f2f7',
    position: 'relative', transition: 'all 0.15s'
  },
  thumbImg:         { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  thumbBadge: {
    position: 'absolute', top: '4px', right: '4px',
    width: '18px', height: '18px', borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.6rem', fontWeight: 700, color: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },
  thumbProgressTrack: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '3px', background: 'rgba(0,0,0,0.15)'
  },
  thumbProgressBar: { height: '100%', background: '#c9a84c', transition: 'width 0.2s' },

  // ── Drop zone ──────────────────────────────────────────────────────────────
  dropZone: {
    border: '2px dashed #c9a84c', borderRadius: '16px',
    background: '#fffdf5', padding: '48px 24px',
    textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.2s', userSelect: 'none'
  },
  dropZoneDragging: { background: '#fef3c7', borderColor: '#f59e0b', transform: 'scale(1.01)' },
  dropIcon:  { fontSize: '2.5rem' },
  dropTitle: { fontWeight: 700, color: '#1a2744', marginTop: 8, fontSize: '1rem' },
  dropSub:   { fontSize: '0.82rem', color: '#9aa3bc', marginTop: 4 },

  // ── Shared ─────────────────────────────────────────────────────────────────
  badge: {
    display: 'inline-block', padding: '3px 10px',
    borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0
  },
  toggleRow: { display: 'flex', background: '#f0f2f7', borderRadius: 8, padding: 3, gap: 3 },
  toggleBtn: {
    flex: 1, padding: '7px', border: 'none', background: 'transparent',
    borderRadius: 6, fontSize: '0.82rem', fontWeight: 600,
    color: '#9aa3bc', cursor: 'pointer', transition: 'all 0.15s'
  },
  toggleBtnActive: {
    background: '#fff', color: '#1a2744',
    boxShadow: '0 1px 4px rgba(26,39,68,0.10)'
  },
  sliderRow:  { display: 'flex', alignItems: 'center', gap: 10 },
  slider:     { flex: 1, accentColor: '#c9a84c', cursor: 'pointer', height: 4 },
  sliderValue: { fontSize: '0.82rem', fontWeight: 700, color: '#1a2744', minWidth: 28, textAlign: 'right' },
  actionRow:  { display: 'flex', gap: 8, marginTop: 'auto' },
  progressTrack: { height: 6, background: '#e2e6f0', borderRadius: 3, overflow: 'hidden', width: '100%' },
  progressBar:   { height: '100%', background: '#c9a84c', borderRadius: 3, transition: 'width 0.2s' },
  uploadingLabel: { fontSize: '0.8rem', color: '#9aa3bc', textAlign: 'center' }
};
