import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { supabase } from '../api/supabaseClient';
import { Spinner } from './SocialUI';

const FILTERS = ['Success Story', 'Help Request', 'Awareness', 'Activity Update', 'Gratitude'];

// FIXED: Extracted entirely OUTSIDE the main component rendering body scope.
// This prevents it from being repeatedly re-created during state updates.
const Toggle = ({ label, value, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
    <div 
      style={{ 
        width: 40, 
        height: 22, 
        borderRadius: 11, 
        background: value ? 'var(--primary)' : 'var(--border)', 
        position: 'relative', 
        transition: 'background 0.2s', 
        flexShrink: 0 
      }} 
      onClick={onChange}
    >
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 4px #0002' }}/>
    </div>
    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
  </label>
);

export default function CreatePost() {
  const { user } = useAuth(); // FIXED: Removed 'profile' if unused to prevent unreferenced assignment warnings
  const navigate = useNavigate();

  const [content, setContent] = useState('');
  const [type, setType] = useState('Success Story');
  const [isStory, setIsStory] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const handleCreatePost = async () => {
    if (!user) { navigate('/login'); return; }
    if (!content.trim()) { setError('Post content cannot be empty.'); return; }
    
    setSubmitting(true);
    setError('');

    try {
      const { error: postErr } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim(),
        type,
        is_story: isStory,
        is_draft: isDraft,
        media: mediaUrl.trim() ? [mediaUrl.trim()] : null,
      });

      if (postErr) {
        setError(postErr.message);
      } else {
        navigate('/feed');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 24, padding: 24, border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>Create Post</h2>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancel</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textAlign: 'left' }}>Category Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14 }}>
            {FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textAlign: 'left' }}>Content Post Text</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Share legal awareness, request community help, or publish activity updates..." style={{ width: '100%', padding: 14, borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, resize: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textAlign: 'left' }}>Optional Attachment Media URL</label>
          <input type="text" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://example.com/image-or-video.mp4" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        {/* Instantiated Safely */}
        <Toggle label="Post as Reel / Story" value={isStory} onChange={() => setIsStory(p => !p)} />
        <Toggle label="Save as Draft" value={isDraft} onChange={() => setIsDraft(p => !p)} />

        {error && (
          <div style={{ background: '#ffe8e8', color: '#c62828', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 14, textAlign: 'left' }}>{error}</div>
        )}

        <button onClick={handleCreatePost} disabled={submitting} className="btn-rainbow" style={{ width: '100%', padding: 14, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? <Spinner /> : 'Publish Post Content'}
        </button>
      </div>
    </div>
  );
}