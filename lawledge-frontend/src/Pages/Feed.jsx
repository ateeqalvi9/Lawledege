import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PostCard from '../Components/PostCard';
import { useAuth } from '../lib/hooks';
import { supabase } from '../api/supabaseClient'; 
import { Spinner, EmptyState } from '../Components/SocialUI';

const FILTERS = ['All', 'Success Story', 'Help Request', 'Awareness', 'Activity Update', 'Gratitude'];

export default function Feed() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [helpBanner, setHelpBanner] = useState(null);
  const [stories, setStories] = useState([]);
  const PAGE_SIZE = 10;

  // Main data loader for posts with pagination support
  const fetchPosts = useCallback(async (reset = false, currentPage = 0) => {
    setLoading(true);
    const from = reset ? 0 : currentPage * PAGE_SIZE;
    
    let q = supabase.from('posts')
      .select('*, users(full_name), volunteer_profiles(profile_pic,location,verified,level)')
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
      
    if (filter !== 'All') q = q.eq('type', filter);
    const { data } = await q;

    let enriched = (data || []).map(p => ({ ...p, like_count: 0, comment_count: 0, user_liked: false, user_saved: false }));

    if (user && enriched.length) {
      const ids = enriched.map(p => p.id);
      const [likesRes, savedRes, likeCountRes, commentCountRes] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('likes').select('post_id').in('post_id', ids),
        supabase.from('comments').select('post_id').in('post_id', ids),
      ]);
      const likedSet = new Set((likesRes.data || []).map(l => l.post_id));
      const savedSet = new Set((savedRes.data || []).map(s => s.post_id));
      const likeMap = {}; 
      const commentMap = {};
      
      (likeCountRes.data || []).forEach(r => { likeMap[r.post_id] = (likeMap[r.post_id] || 0) + 1; });
      (commentCountRes.data || []).forEach(r => { commentMap[r.post_id] = (commentMap[r.post_id] || 0) + 1; });
      
      enriched = enriched.map(p => ({ 
        ...p, 
        user_liked: likedSet.has(p.id), 
        user_saved: savedSet.has(p.id), 
        like_count: likeMap[p.id] || 0, 
        comment_count: commentMap[p.id] || 0 
      }));
    }

    if (reset) setPosts(enriched);
    else setPosts(prev => [...prev, ...enriched]);
    setLoading(false);
  }, [filter, user]);
  // Get the most recent high-priority help request
  const fetchHelpBanner = useCallback(async () => {
    const { data } = await supabase.from('help_requests').select('*, users(full_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(1);
    if (data && data.length) setHelpBanner(data[0]);
  }, []);
  // Load visual stories (reels) for the top bar

  const fetchStories = useCallback(async () => {
    const { data } = await supabase.from('posts')
      .select('*, users(full_name), volunteer_profiles(profile_pic,verified)')
      .eq('is_story', true)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(10);
    setStories(data || []);
  }, []);

  // Component startup and filter change synchronization
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (isMounted) {
        await fetchPosts(true, 0); 
        await fetchHelpBanner();
        await fetchStories();
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [filter, user, fetchPosts, fetchHelpBanner, fetchStories]);

  // Triggered when user clicks "Load More" at bottom of feed
  const handleLoadMore = async () => {
    const nextPageIndex = Math.floor(posts.length / PAGE_SIZE);
    await fetchPosts(false, nextPageIndex);
  };

  const authorName = profile?.full_name || '';
  const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ME';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Navigation and Branding */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="rainbow-bar" />
        <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%"><stop offset="0%" stopColor="#7b2ff7" /><stop offset="100%" stopColor="#ff0080" /></linearGradient></defs>
              <path d="M12 2L3 7l4 9h10l4-9-9-5z" /><line x1="12" y1="22" x2="12" y2="16" />
            </svg>
            <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 22, background: 'linear-gradient(90deg,#7b2ff7,#ff0080)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Lawledge
            </span>
          </div>
          {/* Right icons */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => navigate(user ? '/notifications' : '/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 10, display: 'flex', alignItems: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
            </button>
            <button onClick={() => navigate(user ? '/messages' : '/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 10, display: 'flex', alignItems: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            </button>
            <button onClick={() => navigate(user ? '/profile' : '/login')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user ? initials : '?'}
            </button>
          </div>
        </div>
        {/* Category Filters */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '0 20px 10px' }}>
          <div className="page-wrap" style={{ display: 'flex', gap: 8, width: '100%' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: 20, whiteSpace: 'nowrap', border: `1.5px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`, background: filter === f ? 'var(--primary)' : 'transparent', color: filter === f ? '#fff' : 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bottom-safe page-wrap" style={{ padding: '12px 16px 0' }}>
        {/* Urgent Alert Banner */}
        {helpBanner && (
          <div onClick={() => navigate('/help')} className="urgent-pulse" style={{ background: 'linear-gradient(135deg,#ff1744,#ff6d00)', borderRadius: 16, padding: '14px 16px', marginBottom: 14, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ffffff22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a2 2 0 012-2.18h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L9.91 16l.09.06a16 16 0 006.08 6.08l.06.04 1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 2 }}>Help Needed Now!</div>
                <div style={{ color: '#ffffffdd', fontSize: 12 }}>{helpBanner.title} — {helpBanner.city}</div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffffaa" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto', flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </div>
        )}

        {/* Sign-up Prompt for Unauthenticated Users */}
        {!user && (
          <div style={{ background: 'linear-gradient(135deg,#f0e8ff,#ffe8f5)', borderRadius: 18, padding: 20, marginBottom: 16, border: '1.5px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>Join 12,000+ Volunteers</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>Like, comment, post and help your community.<br />Register to participate!</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-rainbow" onClick={() => navigate('/register')} style={{ flex: 1, padding: 11 }}>Register</button>
              <button className="btn-outline" onClick={() => navigate('/login')} style={{ flex: 1, padding: 11 }}>Login</button>
            </div>
          </div>
        )}

        {/* Visual Reels Horizontal List */}
        {stories.length > 0 && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, marginBottom: 14 }}>
            {stories.map(story => {
              const imgUrl = story.media?.[0] || 'https://via.placeholder.com/150';
              const isVideo = imgUrl.match(/\.(mp4|webm|ogg|mov)$/i);
              return (
                <div key={story.id} style={{ flexShrink: 0, width: 80, cursor: 'pointer' }} onClick={() => navigate(`/reels`)}>
                  <div style={{ width: 80, height: 120, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--primary)', padding: 2, position: 'relative' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                      {isVideo ? <video src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 10, color: '#fff', fontWeight: 700, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {story.users?.full_name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Post Input */}
        {user && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '12px 14px', border: '1.5px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxShadow: 'var(--shadow)' }} onClick={() => navigate('/create')}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', display: 'flex', alignItems: 'center', justifyBontent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 20, padding: '10px 16px', fontSize: 13, color: 'var(--muted)', textAlign: 'left' }}>Share a success story or help request...</div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </div>
        )}

        {/* Main Feed Content */}
        {loading && posts.length === 0 ? <Spinner /> : posts.length === 0 ? (
          <EmptyState icon="📭" text="No posts yet" sub="Be the first to share!" />
        ) : (
          <>
            {posts.map(post => <PostCard key={post.id} post={post} />)}
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {loading ? <Spinner /> : (
                <button onClick={handleLoadMore} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 12, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Load More
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}