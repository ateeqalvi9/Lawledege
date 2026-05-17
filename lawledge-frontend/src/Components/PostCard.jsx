import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks'; // FIXED: Aligned hook to the unified shared repository channel
import { supabase } from '../api/supabaseClient';
import { Avatar, Badge } from './SocialUI'; // Points cleanly to your global social UI wrapper components

export default function PostCard({ post, onRefresh }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.user_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [saved, setSaved] = useState(post.user_saved || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const name = post.users?.full_name || 'Volunteer';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      if (liked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        setLiked(false);
        setLikeCount(c => Math.max(0, c - 1));
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
        setLiked(true);
        setLikeCount(c => c + 1);
      }
    } catch (err) {
      console.error('Failed processing interaction row state update:', err);
    }
  };

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      if (saved) {
        await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', user.id);
        setSaved(false);
      } else {
        await supabase.from('saved_posts').insert({ post_id: post.id, user_id: user.id });
        setSaved(true);
      }
    } catch (err) {
      console.error('Failed processing archival logging track update:', err);
    }
  };

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return; }
    setShowComments(true);
    setLoadingComments(true);
    const { data } = await supabase.from('comments').select('*, users(full_name)').eq('post_id', post.id).order('created_at', { ascending: true });
    setComments(data || []);
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user) return;
    const { data } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: user.id,
      text: newComment.trim()
    }).select('*, users(full_name)').single();
    
    if (data) {
      setComments(prev => [...prev, data]);
      setNewComment('');
      if (onRefresh) onRefresh();
    }
  };

  // Pure mathematical converter expression captures current baseline snapshot
  const formatCardTimeBase = (ts) => {
    if (!ts) return 'Recently';
    const d = new Date(ts);
    return d.toLocaleDateString();
  };

  return (
    <div className="card" style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)', textAlign: 'left' }}>
      {/* Header Block Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div onClick={() => post.user_id && navigate(`/profile/${post.user_id}`)} style={{ cursor: 'pointer' }}>
          <Avatar initials={initials} src={post.volunteer_profiles?.profile_pic} size={40} ring={post.volunteer_profiles?.verified} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span onClick={() => post.user_id && navigate(`/profile/${post.user_id}`)} style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>{name}</span>
            {post.volunteer_profiles?.verified && <span style={{ fontSize: 12 }}>✅</span>}
            <Badge text={post.type} small />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {post.volunteer_profiles?.location ? `📍 ${post.volunteer_profiles.location} · ` : ''}
            {formatCardTimeBase(post.created_at)}
          </div>
        </div>
      </div>

      {/* Main Content Layout Body */}
      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{post.content}</p>

      {/* Attachment Media Layout Checks */}
      {post.media && post.media.length > 0 && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14, background: '#000' }}>
          {post.media[0].match(/\.(mp4|webm|ogg|mov)$/i) ? (
            <video src={post.media[0]} controls style={{ width: '100%', maxHeight: 360, objectFit: 'contain' }} />
          ) : (
            <img src={post.media[0]} alt="attachment" style={{ width: '100%', maxHeight: 360, objectFit: 'contain' }} />
          )}
        </div>
      )}

      {/* Engagement Interaction Row Buttons */}
      <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: liked ? '#ff0080' : 'var(--muted)', fontWeight: 600 }}>
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likeCount} Likes</span>
        </button>
        <button onClick={loadComments} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
          <span>💬</span>
          <span>{post.comment_count || comments.length} Comments</span>
        </button>
        <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', fontSize: 13, color: saved ? 'var(--primary)' : 'var(--muted)', fontWeight: 600 }}>
          <span>{saved ? '🔖 Saved' : '🔖 Save'}</span>
        </button>
      </div>

      {/* Real-time Sub-Comment Section Drawer Toggle */}
      {showComments && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {loadingComments ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading context tracks...</div> : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {comments.map(c => (
                  <div key={c.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', marginBottom: 2, textAlign: 'left' }}>{c.users?.full_name || 'Anonymous User'}</div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', textAlign: 'left', lineHeight: 1.4 }}>{c.text}</p>
                  </div>
                ))}
              </div>
              {user && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()} placeholder="Write a comment response..." style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, background: 'var(--bg)' }} />
                  <button onClick={submitComment} disabled={!newComment.trim()} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Send</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}