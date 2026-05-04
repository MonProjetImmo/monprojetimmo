import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Chat from '../components/Chat.jsx';
import PostGenerator from '../components/PostGenerator.jsx';
import EditorialCalendar from '../components/EditorialCalendar.jsx';
import Preview from '../components/Preview.jsx';

const TABS = [
  { id: 'chat', label: 'Agent IA', icon: '💬' },
  { id: 'generate', label: 'Générateur', icon: '✍️' },
  { id: 'calendar', label: 'Calendrier', icon: '📅' },
  { id: 'preview', label: 'Prévisualisation', icon: '👁️' }
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [previewPost, setPreviewPost] = useState(null);

  function handlePreview(post) {
    setPreviewPost(post);
    setActiveTab('preview');
  }

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🏠</span>
          <div>
            <div style={styles.brandName}>Mon Projet Immo</div>
            <div style={styles.brandSub}>CM IA</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.navItem,
                ...(activeTab === tab.id ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'generate' && <PostGenerator onPreview={handlePreview} />}
        {activeTab === 'calendar' && <EditorialCalendar />}
        {activeTab === 'preview' && <Preview post={previewPost} />}
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden'
  },
  sidebar: {
    width: '240px',
    flexShrink: 0,
    background: '#1a2744',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 8px 28px'
  },
  brandIcon: { fontSize: '2rem' },
  brandName: { fontWeight: 800, fontSize: '1rem', color: '#fff' },
  brandSub: { fontSize: '0.75rem', color: '#c9a84c' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '11px 12px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: '#9aa3bc',
    fontSize: '0.92rem',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    width: '100%'
  },
  navItemActive: {
    background: 'rgba(201,168,76,0.15)',
    color: '#c9a84c',
    fontWeight: 700
  },
  navIcon: { fontSize: '1.1rem', width: '20px', textAlign: 'center' },
  userSection: { paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#c9a84c',
    color: '#1a2744',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.9rem',
    flexShrink: 0
  },
  userName: { fontSize: '0.88rem', fontWeight: 600, color: '#fff' },
  userEmail: { fontSize: '0.75rem', color: '#9aa3bc' },
  main: { flex: 1, overflow: 'auto', background: '#f8f9fc' }
};
