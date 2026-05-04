import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏠</span>
          <div>
            <div style={styles.logoTitle}>Mon Projet Immo</div>
            <div style={styles.logoSub}>Community Manager IA</div>
          </div>
        </div>

        <h2 style={styles.heading}>Connexion</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@monprojetimmo.fr"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={styles.hint}>
          Compte par défaut : <strong>admin@monprojetimmo.fr</strong> / <strong>Admin123!</strong>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a2744 0%, #243158 100%)',
    padding: '20px'
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px'
  },
  logoIcon: { fontSize: '2.5rem' },
  logoTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1a2744' },
  logoSub: { fontSize: '0.82rem', color: '#9aa3bc' },
  heading: { fontSize: '1.4rem', fontWeight: 700, color: '#1a2744', marginBottom: '24px' },
  error: {
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '16px',
    fontSize: '0.88rem'
  },
  hint: {
    marginTop: '20px',
    fontSize: '0.8rem',
    color: '#9aa3bc',
    textAlign: 'center'
  }
};
