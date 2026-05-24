import { useNavigate, useLocation } from 'react-router-dom';

// Definition of navigation tabs and their icons
const tabs = [
  { path: '/feed',        label: 'Home',    icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active?'#7b2ff7':'none'} stroke={active?'#7b2ff7':'#7a6d8e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  )},
  { path: '/explore',     label: 'Explore', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?'#7b2ff7':'#7a6d8e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  )},
  { path: '/create',      label: '',        special: true },
  { path: '/help',        label: 'Help',    icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?'#7b2ff7':'#7a6d8e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.08 6.08l1.51-1.51a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
  )},
  { path: '/profile',     label: 'Me',      icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?'#7b2ff7':'#7a6d8e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )},
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(20px)',
      borderTop: '1.5px solid var(--border)',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div className="rainbow-bar" />
      <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', padding:'6px 8px 10px' }}>
        {tabs.map(tab => {
          const active = pathname === tab.path || (tab.path !== '/feed' && pathname.startsWith(tab.path));
          // Special styling for the central "Create" button
          if (tab.special) return (
            <button key={tab.path} onClick={() => navigate('/create')} style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7b2ff7,#ff0080)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -24,
              boxShadow: '0 4px 20px rgba(123,47,247,0.55)',
              flexShrink: 0,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          );

          return (
            <button key={tab.path} onClick={() => navigate(tab.path)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 12px', position: 'relative', flexShrink: 0,
            }}>
              {tab.icon(active)}
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--muted)', fontFamily: 'Poppins,sans-serif' }}>
                {tab.label}
              </span>
              {active && (
                <div style={{ position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)', width:20, height:3, borderRadius:3, background:'linear-gradient(90deg,#7b2ff7,#ff0080)' }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
