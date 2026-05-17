import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../lib/hooks';
import { Spinner, Badge, EmptyState } from '../Components/SocialUI';

async function ensureUserRow(user) {
  await supabase.from('users').upsert(
    { id: user.id, full_name: user.user_metadata?.full_name || user.email.split('@')[0], is_volunteer: false },
    { onConflict: 'id', ignoreDuplicates: true }
  );
}

export default function HelpRequests() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isVolunteer = profile?.is_volunteer !== false && profile?.level;

  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [myResponses, setMyResponses] = useState(new Set());
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', city: '', area: '', required_volunteers: 1, urgency: 'normal' });

  // Wrapped inside a stable useCallback tracking framework
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('help_requests')
        .select('*, users(full_name), help_volunteers(user_id, users(full_name, phone))')
        .order('created_at', { ascending: false });

      if (error) console.error('help_requests fetch:', error);
      setRequests(data || []);

      if (user && data) {
        const mine = data.filter(r => (r.help_volunteers || []).some(v => v.user_id === user.id)).map(r => r.id);
        setMyResponses(new Set(mine));
      }
    } catch (err) {
      console.error('Failed to load help requests:', err);
    }
    setLoading(false);
  }, [user]);

  // FIXED: Synchronous state updates isolated via standard safe async transactional task wrapper
  useEffect(() => { 
    let isMounted = true;

    const executeLoad = async () => {
      if (isMounted) {
        await loadRequests();
      }
    };

    executeLoad();

    return () => {
      isMounted = false;
    };
  }, [loadRequests]);

  const respond = async (helpId) => {
    if (!user) { navigate('/login'); return; }
    if (myResponses.has(helpId)) {
      const { error } = await supabase.from('help_volunteers').delete().eq('help_id', helpId).eq('user_id', user.id);
      if (!error) setMyResponses(prev => { const s = new Set(prev); s.delete(helpId); return s; });
    } else {
      await ensureUserRow(user);
      const { error } = await supabase.from('help_volunteers').insert({ help_id: helpId, user_id: user.id });
      if (!error) setMyResponses(prev => new Set([...prev, helpId]));
      else console.error('respond error:', error);
    }
    loadRequests();
  };

  const createRequest = async () => {
    if (!user) { navigate('/login'); return; }
    if (!form.title.trim()) { setSubmitError('Title is required'); return; }
    if (!form.city.trim())  { setSubmitError('City is required'); return; }
    setSubmitting(true); setSubmitError('');

    try {
      await ensureUserRow(user);

      const { error } = await supabase.from('help_requests').insert({
        title:               form.title.trim(),
        description:         form.description.trim() || null,
        city:                form.city.trim(),
        area:                form.area.trim() || null,
        required_volunteers: Number(form.required_volunteers) || 1,
        urgency:             form.urgency,
        created_by:          user.id,
        status:              'open',
      });

      if (error) {
        console.error('help_requests insert:', error);
        setSubmitError(error.message);
      } else {
        setForm({ title: '', description: '', city: '', area: '', required_volunteers: 1, urgency: 'normal' });
        setShowCreate(false);
        loadRequests();
      }
    } catch (err) {
      console.error('Unexpected post failure:', err);
    }
    setSubmitting(false);
  };

  const urgencyColor = { urgent: '#ff1744', normal: '#ff8c00', low: '#00c851' };
  const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Multan', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Quetta'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'linear-gradient(135deg,#ff1744,#ff6d00)', padding: '48px 20px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a2 2 0 012-2.18h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L9.91 16l.09.06a16 16 0 006.08 6.08l.06.04 1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        </div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Help Requests</h1>
        <p style={{ color: '#ffffffcc', fontSize: 12, marginBottom: 16 }}>
          {isVolunteer ? 'Respond to open help requests' : 'Post a request — volunteers will help you'}
        </p>
        {user && !isVolunteer && (
          <button onClick={() => setShowCreate(true)} style={{ background: '#fff', color: '#ff1744', border: 'none', borderRadius: 14, padding: '10px 24px', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
            + Post Help Request
          </button>
        )}
        {user && isVolunteer && (
          <div style={{ background: '#ffffff22', borderRadius: 12, padding: '8px 16px', fontSize: 12, color: '#fff', display: 'inline-block' }}>
            As a volunteer, you respond to requests below
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: '#0009', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowCreate(false)}>
          <div className="slide-up card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, margin: '0 auto', borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>New Help Request</span>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            {[
              { label: 'Title *', key: 'title', placeholder: 'e.g. Need 2 volunteers for court tomorrow' },
              { label: 'Description', key: 'description', placeholder: 'Describe the situation in detail...', multi: true },
              { label: 'Area / Locality', key: 'area', placeholder: 'e.g. Gulberg, DHA...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>{f.label}</div>
                {f.multi ? (
                  <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={3} placeholder={f.placeholder}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: '11px 14px', fontSize: 14, resize: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>City *</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CITIES.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, city: c }))} style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${form.city === c ? '#ff1744' : 'var(--border)'}`, background: form.city === c ? '#ffe8e8' : 'transparent', color: form.city === c ? '#ff1744' : 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Volunteers Needed</div>
                <input type="number" min={1} max={50} value={form.required_volunteers} onChange={e => setForm(p => ({ ...p, required_volunteers: e.target.value }))}
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Urgency</div>
                <select value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' }}>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            {submitError && (
              <div style={{ background: '#ffe8e8', color: '#c62828', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{submitError}</div>
            )}

            <button onClick={createRequest} disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#ff1744,#ff6d00)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Posting...' : 'Post Help Request'}
            </button>
          </div>
        </div>
      )}

      <div className="bottom-safe" style={{ padding: '16px 12px 0', maxWidth: 600, margin: '0 auto' }}>
        {loading ? <Spinner /> : requests.length === 0 ? (
          <EmptyState icon="🤝" text="No help requests yet" sub={user && !isVolunteer ? "Post one using the button above!" : "Check back soon"} />
        ) : requests.map(req => {
          const volunteers  = (req.help_volunteers || []).length;
          const isMine      = myResponses.has(req.id);
          const isFull      = volunteers >= req.required_volunteers;
          const uColor      = urgencyColor[req.urgency] || '#ff8c00';
          return (
            <div key={req.id} className={`card ${req.urgency === 'urgent' ? 'urgent-pulse' : ''}`} style={{ marginBottom: 14, border: `2px solid ${req.urgency === 'urgent' ? '#ff1744' : 'var(--border)'}` }}>
              <div style={{ height: 4, background: `linear-gradient(90deg,${uColor},transparent)` }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', flex: 1, textAlign: 'left' }}>{req.title}</h3>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {req.urgency === 'urgent' && <Badge text="URGENT" type="urgent" small />}
                    <Badge text={req.status} type={req.status === 'open' ? 'open' : 'closed'} small />
                  </div>
                </div>
                {req.description && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10, textAlign: 'left' }}>{req.description}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  <span>📍 {req.city}{req.area ? ` · ${req.area}` : ''}</span>
                  <span>👥 {volunteers}/{req.required_volunteers} volunteers</span>
                  <span>by {req.users?.full_name || 'Anonymous'}</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 10, height: 6, marginBottom: 12 }}>
                  <div style={{ width: `${Math.min((volunteers / req.required_volunteers) * 100, 100)}%`, height: '100%', background: isFull ? '#00c851' : `linear-gradient(90deg,#7b2ff7,#ff0080)`, borderRadius: 10, transition: 'width 0.4s' }} />
                </div>
                
                {user && req.created_by === user.id && req.help_volunteers && req.help_volunteers.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text)', textAlign: 'left' }}>Responding Volunteers:</div>
                    {req.help_volunteers.map(hv => (
                      <div key={hv.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', padding: '8px 12px', borderRadius: 12, marginBottom: 6, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{hv.users?.full_name || 'Volunteer'}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => navigate('/messages', { state: { partnerId: hv.user_id, partnerName: hv.users?.full_name || 'Volunteer' } })} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Message</button>
                          {hv.users?.phone && (
                            <a href={`tel:${hv.users.phone}`} style={{ background: '#e8fff3', color: '#1b5e20', textDecoration: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600 }}>Call</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {req.status === 'open' && user && isVolunteer && (
                  <button onClick={() => respond(req.id)} style={{ width: '100%', background: isMine ? '#e8fff3' : 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: isMine ? '#1b5e20' : '#fff', border: isMine ? '2px solid #00c851' : 'none', borderRadius: 12, padding: '11px', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {isMine ? '✓ You Responded — Cancel?' : isFull ? 'Join Waitlist' : 'I Can Help!'}
                  </button>
                )}
                {!user && (
                  <button onClick={() => navigate('/login')} style={{ width: '100%', background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                    Login to Respond
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}