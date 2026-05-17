import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../lib/hooks'; 
import { Spinner, EmptyState } from '../Components/SocialUI';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pure state to store our current runtime snapshot safely outside the raw render calculations
  const [timeSnapshot, setTimeSnapshot] = useState(null);

  // Wrapped inside a stable useCallback tracking framework to satisfy React dependency rules
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get recent activity on user's posts
      const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', user.id);
      const postIds = (myPosts || []).map(p => p.id);

      const items = [];

      if (postIds.length) {
        const [{ data: recentLikes }, { data: recentComments }] = await Promise.all([
          supabase.from('likes').select('*, users(full_name)').in('post_id', postIds).neq('user_id', user.id).order('id', { ascending: false }).limit(20),
          supabase.from('comments').select('*, users(full_name)').in('post_id', postIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        ]);

        (recentLikes || []).forEach(l => items.push({ type: 'like', user: l.users?.full_name, post_id: l.post_id, icon: '❤️', text: 'liked your post', time: null }));
        (recentComments || []).forEach(c => items.push({ type: 'comment', user: c.users?.full_name, post_id: c.post_id, icon: '💬', text: `commented: "${c.text?.slice(0, 40)}..."`, time: c.created_at }));
      }

      // New followers
      const { data: followers } = await supabase.from('follows').select('*, users!follower_id(full_name)').eq('following_id', user.id).order('id', { ascending: false }).limit(10);
      (followers || []).forEach(f => items.push({ type: 'follow', user: f.users?.full_name, follower_id: f.follower_id, icon: '👤', text: 'started following you', time: null }));

      // Help requests in user's city
      const { data: profile } = await supabase.from('volunteer_profiles').select('location').eq('user_id', user.id).single();
      if (profile?.location) {
        const { data: helpReqs } = await supabase.from('help_requests').select('*').eq('city', profile.location).eq('status', 'open').order('created_at', { ascending: false }).limit(5);
        (helpReqs || []).forEach(h => items.push({ type: 'help', user: 'System', icon: '🆘', text: `New help request near you: ${h.title}`, time: h.created_at, help_id: h.id }));
      }

      setNotifs(items.slice(0, 30));
    } catch (err) {
      console.error('Failed to parse notifications grid tracking payload:', err);
    }
    setLoading(false);
  }, [user]);

  // Separates mounting transitions securely via a safe async transactional mount flag
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    
    let isMounted = true;
    const initializeNotificationHub = async () => {
      if (isMounted) {
        setTimeSnapshot(Date.now()); // SAFE: Capturing impure clock snapshot within a non-render side-effect loop
        await fetchNotifications();
      }
    };

    initializeNotificationHub();
    return () => {
      isMounted = false;
    };
  }, [user, navigate, fetchNotifications]);

  // FIXED: 100% Pure mathematical converter utility. Removed any fallback calls to Date.now()
  const formatTimeAgo = (ts, snapshotBase) => {
    if (!ts || !snapshotBase) return 'Recently'; // Deterministic output strategy prevents render engine panic
    
    const diff = snapshotBase - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sticky header view container */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#ff0080,#ff8c00,#ffd700,#00c851,#00bcd4,#7b2ff7)' }} />
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>Notifications</h2>
        </div>
      </div>

      {/* Notifications view stream layout block */}
      <div style={{ padding: '12px 12px 80px' }}>
        {loading ? <Spinner /> : notifs.length === 0 ? (
          <EmptyState icon="🔔" text="No notifications yet" sub="Start interacting with the community!" />
        ) : notifs.map((n, i) => (
          <div key={i} onClick={() => { if (n.type === 'help') navigate('/help'); else if (n.post_id) navigate('/feed'); }}
            style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1.5px solid var(--border)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: n.type === 'help' ? '#ffe8e8' : n.type === 'like' ? '#fce4ec' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {n.icon}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                <strong>{n.user}</strong> {n.text}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {formatTimeAgo(n.time, timeSnapshot)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}