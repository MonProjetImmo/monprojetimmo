import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../api/index.js';

const STATUS_OPTIONS = ['Planifié', 'En cours', 'Publié', 'Annulé'];
const PLATFORM_OPTIONS = ['Instagram', 'Facebook', 'TikTok'];

function statusBadgeClass(status) {
  const map = { 'Planifié': 'planifie', 'En cours': 'en-cours', 'Publié': 'publie', 'Annulé': 'annule' };
  return `badge badge-${map[status] || 'planifie'}`;
}

function platformBadgeClass(platform) {
  return `badge badge-${platform?.toLowerCase()}`;
}

const EMPTY_FORM = {
  date: '',
  platform: 'Instagram',
  content_type: '',
  topic: '',
  status: 'Planifié',
  content: '',
  notes: '',
  time: ''
};

export default function EditorialCalendar() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    loadCalendar();
  }, []);

  async function loadCalendar() {
    setLoading(true);
    setError('');
    try {
      const res = await calendarAPI.getAll();
      setEntries(res.data.data || []);
      setIsDemo(!!res.data.demo);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger le calendrier');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditEntry(null);
    setShowForm(true);
  }

  function openEdit(entry) {
    setForm({
      date: entry['Date'] || '',
      platform: entry['Plateforme'] || 'Instagram',
      content_type: entry['Type de contenu'] || '',
      topic: entry['Sujet'] || '',
      status: entry['Statut'] || 'Planifié',
      content: entry['Contenu'] || '',
      notes: entry['Notes'] || '',
      time: entry['Heure publication'] || ''
    });
    setEditEntry(entry);
    setShowForm(true);
  }

  async function handleDelete(entry) {
    if (!confirm(`Supprimer "${entry['Sujet']}" ?`)) return;
    try {
      await calendarAPI.delete(entry.row);
      await loadCalendar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editEntry) {
        await calendarAPI.update(editEntry.row, form);
      } else {
        await calendarAPI.create(form);
      }
      setShowForm(false);
      await loadCalendar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Calendrier éditorial</h1>
          <p style={styles.subtitle}>
            {isDemo ? 'Mode démonstration — configurez Google Sheets pour les vraies données' : 'Synchronisé avec Google Sheets'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadCalendar} className="btn btn-outline btn-sm">Actualiser</button>
          <button onClick={openAdd} className="btn btn-gold">+ Ajouter</button>
        </div>
      </header>

      {isDemo && (
        <div style={styles.demoBanner}>
          Google Sheets non configuré — données de démonstration affichées. Configurez <code>GOOGLE_SHEETS_ID</code> dans le fichier <code>.env</code>.
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loadingState}>Chargement du calendrier...</div>
      ) : entries.length === 0 ? (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>📅</span>
          <p>Aucune entrée dans le calendrier</p>
          <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: '12px' }}>
            Créer la première entrée
          </button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date', 'Plateforme', 'Type', 'Sujet', 'Statut', 'Heure', 'Actions'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.row} style={styles.tr}>
                  <td style={styles.td}>{entry['Date']}</td>
                  <td style={styles.td}>
                    <span className={platformBadgeClass(entry['Plateforme'])}>{entry['Plateforme']}</span>
                  </td>
                  <td style={styles.td}>{entry['Type de contenu']}</td>
                  <td style={{ ...styles.td, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry['Sujet']}
                  </td>
                  <td style={styles.td}>
                    <span className={statusBadgeClass(entry['Statut'])}>{entry['Statut']}</span>
                  </td>
                  <td style={styles.td}>{entry['Heure publication']}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(entry)} className="btn btn-outline btn-sm">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(entry)} className="btn btn-danger btn-sm">
                        Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>
              {editEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="text" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="DD/MM/YYYY" required />
                </div>
                <div className="form-group">
                  <label>Heure</label>
                  <input type="text" className="form-control" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="18h00" />
                </div>
                <div className="form-group">
                  <label>Plateforme *</label>
                  <select className="form-control" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                    {PLATFORM_OPTIONS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Statut *</label>
                  <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Type de contenu *</label>
                <input type="text" className="form-control" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} placeholder="Annonce bien, Conseil achat..." required />
              </div>
              <div className="form-group">
                <label>Sujet *</label>
                <input type="text" className="form-control" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Titre ou sujet du post" required />
              </div>
              <div className="form-group">
                <label>Contenu</label>
                <textarea className="form-control" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} placeholder="Texte du post (optionnel)" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input type="text" className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Instructions visuelles, remarques..." />
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-gold">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#1a2744' },
  subtitle: { fontSize: '0.85rem', color: '#9aa3bc', marginTop: 2 },
  demoBanner: {
    background: '#fff8e1',
    border: '1px solid #ffe082',
    borderRadius: '8px',
    padding: '10px 16px',
    marginBottom: '16px',
    fontSize: '0.85rem',
    color: '#f57f17'
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '0.88rem'
  },
  loadingState: { textAlign: 'center', color: '#9aa3bc', padding: '60px' },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px',
    color: '#9aa3bc',
    textAlign: 'center'
  },
  emptyIcon: { fontSize: '3rem', marginBottom: '12px' },
  tableWrapper: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(26,39,68,0.08)',
    overflow: 'auto'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#9aa3bc',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #f0f2f7',
    whiteSpace: 'nowrap'
  },
  tr: { borderBottom: '1px solid #f0f2f7', transition: 'background 0.1s' },
  td: { padding: '12px 16px', fontSize: '0.88rem', color: '#2d3454', verticalAlign: 'middle' },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26,39,68,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: { fontSize: '1.2rem', fontWeight: 800, color: '#1a2744', marginBottom: '24px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }
};
