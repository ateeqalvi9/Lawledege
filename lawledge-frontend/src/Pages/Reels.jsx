import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../lib/hooks'; 
import { Avatar } from '../Components/SocialUI'; // Case matching folder path mapping alignment
// Static data used when no posts are found in the database
// Mock fallback reels with static deterministic metrics to prevent render calculations traps
const MOCK_REELS = [
  { id: '1', content: "Know Your Rights: Every citizen has the right to know the FIR number within 24 hours of filing a complaint. Don't let anyone deny you this!", author: 'Ayesha Malik', city: 'Lahore', likes: 2340, views: 18400, type: 'Awareness', gradient: 'linear-gradient(135deg,#7b2ff7,#ff0080)' },
  { id: '2', content: "SUCCESS: Today we helped 3 women register FIRs who were being turned away by police for 2 days. Know the law, protect your community!", author: 'Omar Farooq', city: 'Multan', likes: 1890, views: 12300, type: 'Success Story', gradient: 'linear-gradient(135deg,#00c851,#00bcd4)' },
  { id: '3', content: "URGENT: Section 506 PPC covers criminal intimidation. If someone threatens you, it's punishable by 2-7 years. Screenshot this and share!", author: 'Bilal Ahmed', city: 'Karachi', likes: 3120, views: 28100, type: 'Legal Tip', gradient: 'linear-gradient(135deg,#ff8c00,#ffd700)' },
  { id: '4', content: "Article 14 of Constitution: Dignity of person is inviolable. No one can humiliate you, strip search you without female officer present. Know this!", author: 'Sana Tariq', city: 'Islamabad', likes: 4560, views: 34200, type: 'Awareness', gradient: 'linear-gradient(135deg,#ff0080,#ff8c00)' },
  { id: '5', content: "Monthly challenge update: Our team conducted 12 legal awareness sessions in Faisalabad this month. 890 people now know their fundamental rights!", author: 'Zara Hussain', city: 'Faisalabad', likes: 1230, views: 9800, type: 'Activity Update', gradient: 'linear-gradient(135deg,#e040fb,#7b2ff7)' },
];

export default function Reels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const containerRef = useRef(null);
  const touchStartY = useRef(0);

  // Fetch legal stories from the database
  const fetchReels = useCallback(async () => {
    try {
      const { data } = await supabase.from('posts')
        .select('*, users(full_name), volunteer_profiles(profile_pic,location)')
        .eq('is_story', true)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        const gradients = [
          'linear-gradient(135deg,#7b2ff7,#ff0080)', 
          'linear-gradient(135deg,#00c851,#00bcd4)', 
          'linear-gradient(135deg,#ff8c00,#ffd700)', 
          'linear-gradient(135deg,#ff0080,#ff8c00)', 
          'linear-gradient(135deg,#e040fb,#7b2ff7)'
        ];
        
        setReels(data.map((p, i) => ({ 
          ...p, 
          gradient: gradients[i % gradients.length], 
          author: p.users?.full_name, 
          city: p.volunteer_profiles?.location, 
          likes: 1200 + (i * 145), 
          views: 8500 + (i * 1240) 
        })));
      } else {
        setReels(MOCK_REELS);
      }
    } catch (err) {
      console.error('Failed to resolve dynamic legal stories feed payloads:', err);
      setReels(MOCK_REELS);
    }
  }, []);

  // Initial setup
  useEffect(() => {
    let isMounted = true;
    
    const initializeReelsFlow = async () => {
      if (isMounted) {
        await fetchReels();
      }
    };

    initializeReelsFlow();
    return () => {
      isMounted = false;
    };
  }, [fetchReels]);

  // Navigation logic
  const goNext = () => setCurrentIndex(i => Math.min(i + 1, reels.length - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));
  // Swipe handlers for mobile
  const handleTouchStart = e => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = e => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
  };

  const toggleLike = (id) => {
    if (!user) { navigate('/login'); return; }
    setLiked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const toggleSave = (id) => {
    if (!user) { navigate('/login'); return; }
    setSaved(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const reel = reels[currentIndex];

  if (!reel) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--muted)' }}>
      <div style={{ fontSize: 48 }}>🎬</div>
      <div style={{ fontWeight: 700 }}>Loading legal reels...</div>
    </div>
  );

  const authorInitials = (reel.author || 'V').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      style={{ height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>

      {/* Visual Background with animated transition effect */}
      <div style={{ position: 'absolute', inset: 0, background: reel.gradient, transition: 'background 0.5s' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: '#ffffff10' }} />
        <div style={{ position: 'absolute', bottom: 100, left: -80, width: 200, height: 200, borderRadius: '50%', background: '#ffffff08' }} />
      </div>

      {/* Progress dots */}
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, zIndex: 10 }}>
        {reels.map((_, i) => (
          <div key={i} onClick={() => setCurrentIndex(i)} style={{ height: 3, borderRadius: 2, background: i === currentIndex ? '#fff' : '#ffffff44', width: i === currentIndex ? 24 : 8, transition: 'all 0.3s', cursor: 'pointer' }} />
        ))}
      </div>

      {/* Navigation Controls */}
      <button onClick={goPrev} disabled={currentIndex === 0} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: '#ffffff22', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentIndex === 0 ? 0.3 : 1, zIndex: 10 }}>‹</button>
      <button onClick={goNext} disabled={currentIndex === reels.length - 1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#ffffff22', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentIndex === reels.length - 1 ? 0.3 : 1, zIndex: 10 }}>›</button>

      {/* Overlay Information */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '60px 16px 90px' }}>
        {/* Category Label */}
        <div style={{ marginBottom: 12, display: 'flex' }}>
          <span style={{ background: '#ffffff22', backdropFilter: 'blur(8px)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>{reel.type}</span>
        </div>

        {/* Creator Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => reel.user_id && navigate(`/profile/${reel.user_id}`)}>
            <Avatar initials={authorInitials} src={reel.volunteer_profiles?.profile_pic} size={42} ring />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{reel.author || 'Volunteer'}</div>
            <div style={{ color: '#ffffffbb', fontSize: 11 }}>📍 {reel.city || 'Pakistan'}</div>
          </div>
          {!user && (
            <button onClick={() => navigate('/login')} style={{ marginLeft: 'auto', background: '#fff', color: 'var(--primary)', border: 'none', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Follow</button>
          )}
        </div>

        {/* Content Body */}
        <p style={{ color: '#fff', fontSize: 15, lineHeight: 1.7, fontWeight: 500, marginBottom: 16, textShadow: '0 1px 4px rgba(0,0,0,0.3)', textAlign: 'left' }}>{reel.content}</p>

        {/* Engagement Stats */}
        <div style={{ display: 'flex', gap: 6, color: '#ffffffaa', fontSize: 12 }}>
          <span>{(reel.views || 0).toLocaleString()} views</span>
          <span>·</span>
          <span>{((reel.likes || 0) + (liked.has(reel.id) ? 1 : 0)).toLocaleString()} likes</span>
        </div>
      </div>

      {/* Vertical Action Menu */}
      <div style={{ position: 'absolute', right: 14, bottom: 120, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', zIndex: 10 }}>
        {[
          { icon: liked.has(reel.id) ? '❤️' : '🤍', label: ((reel.likes || 0) + (liked.has(reel.id) ? 1 : 0)).toLocaleString(), action: () => toggleLike(reel.id) },
          { icon: '💬', label: 'Comment', action: () => !user && navigate('/login') },
          { icon: '📤', label: 'Share', action: () => navigator.share?.({ text: reel.content }).catch(() => {}) },
          { icon: saved.has(reel.id) ? '🔖' : '📋', label: 'Save', action: () => toggleSave(reel.id) },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#ffffff22', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid #ffffff30' }}>{btn.icon}</div>
            <span style={{ color: '#ffffffcc', fontSize: 10, fontWeight: 600 }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Call to Action for Guests */}
      {!user && (
        <div style={{ position: 'absolute', bottom: 84, left: 0, right: 0, padding: '0 16px', zIndex: 10 }}>
          <div style={{ background: '#ffffff18', backdropFilter: 'blur(12px)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #ffffff30' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Join to like, comment & share</span>
            <button onClick={() => navigate('/register')} style={{ background: '#fff', color: 'var(--primary)', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Join Free</button>
          </div>
        </div>
      )}

      {/* Navigation Hint */}
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center', color: '#ffffff66', fontSize: 11 }}>
        Swipe up/down to browse
      </div>
    </div>
  );
}