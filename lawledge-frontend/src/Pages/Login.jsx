import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../api/supabaseClient'; // Adjusted to match monolithic client path
import { useAuth } from '../lib/hooks'; // Shifted to centralized hooks channel

export default function Login() {
  const navigate = useNavigate();
  // FIXED: Extracted the active 'login' module handle if needed, or left clean. 
  // Removed unused 'logout' variable destructuring entirely.
  useAuth(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');

    const { data, error: err } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });

    if (err) {
      if (err.message.includes('Invalid login credentials'))
        setError('Email or password is incorrect. Please try again.');
      else if (err.message.includes('Email not confirmed'))
        setError('Please confirm your email first, or disable email confirmation in Supabase.');
      else
        setError(err.message);
    } else {
      if (data.user) {
        await supabase.from('users').upsert(
          { id: data.user.id, full_name: data.user.user_metadata?.full_name || email.split('@')[0] },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      }
      navigate('/feed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Header Section Banner */}
      <div style={{ background: 'linear-gradient(135deg,#7b2ff7 0%,#ff0080 60%,#ff8c00 100%)', padding: '64px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: '#ffffff10' }}/>
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: '#ffffff08' }}/>
        <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 7l4 9h10l4-9-9-5z"/><line x1="12" y1="22" x2="12" y2="16"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 36, color: '#fff', marginBottom: 8, letterSpacing: '-0.5px' }}>Lawledge</h1>
        <p style={{ color: '#ffffffcc', fontSize: 14 }}>Pakistan's Volunteer Justice Network</p>
        <div style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)', width: '150%', height: 56, background: 'var(--bg)', borderRadius: '50% 50% 0 0' }}/>
      </div>

      {/* Form Input Container Card */}
      <div style={{ flex: 1, padding: '32px 24px', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontWeight: 800, fontSize: 24, color: 'var(--text)', marginBottom: 6 }}>Welcome back</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>Sign in to continue your mission</p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textAlign: 'left' }}>Email Address</div>
          <input type="email" value={email} placeholder="your@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
            style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 14, padding: '13px 16px', fontSize: 14, background: '#fff', color: 'var(--text)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textAlign: 'left' }}>Password</div>
          <input type="password" value={password} placeholder="••••••••"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
            style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 14, padding: '13px 16px', fontSize: 14, background: '#fff', color: 'var(--text)', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ background: '#ffe8e8', color: '#c62828', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 16, textAlign: 'left' }}>{error}</div>
        )}

        <button className="btn-rainbow" onClick={handleLoginSubmit} disabled={loading} style={{ marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <button className="btn-outline" onClick={() => navigate('/feed')} style={{ marginBottom: 28 }}>
          Browse as Guest (Read Only)
        </button>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
          New volunteer?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Create Account</Link>
        </p>
      </div>
    </div>
  );
}