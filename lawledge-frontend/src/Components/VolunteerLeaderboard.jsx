import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../lib/AuthContext';

function LeaderboardAvatar({ name, src, size = 44 }) {
  const ini = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const cols = ['#7b2ff7', '#ff0080', '#ff8c00', '#00c851', '#00bcd4', '#e040fb'];
  const c = cols[(name || '').charCodeAt(0) % cols.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2.5px solid ${c}`, background: src ? '#000' : `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 800, color: c }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} /> : ini}
    </div>
  );
}

const LEVEL_COLORS = { Newbie: '#78909c', Active: '#43a047', Leader: '#ff8c00', Legend: '#7b2ff7' };

const CHALLENGE_ACTIONS = {
  'Conduct 5 awareness sessions': { action: 'awareness_session', target: 5, pts: 50 },
  'Help 3 FIR filings': { action: 'fir_filed', target: 3, pts: 75 },
  'Respond to 5 help requests': { action: 'help_responded', target: 5, pts: 60 },
  'Post 10 content pieces': { action: 'post_created', target: 10, pts: 40 },
  'Recruit 3 volunteers': { action: 'volunteer_recruited', target: 3, pts: 80 },
};

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [myProgress, setMyProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [myRank, setMyRank] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    let q = supabase.from('volunteer_profiles').select('*, users(full_name, id)').order('points', { ascending: false }).limit(100);
    if (tab === 'city' && user) {
      const { data: vp } = await supabase.from('volunteer_profiles').select('location').eq('user_id', user.id).maybeSingle();
      if (vp?.location) q = q.eq('location', vp.location);
    }

    const [{ data: profiles }, { data: chs }] = await Promise.all([
      q,
      supabase.from('challenges').select('*').eq('active', true).order('created_at', { ascending: false }).limit(10),
    ]);

    setLeaders(profiles || []);
    setChallenges(chs || []);

    if (user) {
      const idx = (profiles || []).findIndex(p => p.user_id === user.id);
      setMyRank(idx >= 0 ? idx + 1 : null);

      const { data: logs } = await supabase.from('activity_logs').select('action').eq('user_id', user.id);
      const counts = {};
      (logs || []).forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
      setMyProgress(counts);
    }

    setLoading(false);
  }, [tab, user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const awardPoints = async (action, pts) => {
    if (!user) return;
    await supabase.from('activity_logs').insert({ user_id: user.id, action });
    // Safe database backend RPC calculation engine execution point sync
    await supabase.rpc('increment_volunteer_points', { p_user_id: user.id, p_points: pts });
    fetchAll();
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#ffd700,#ff8c00,#ff0080)', padding: '48px 20px 24px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
          <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
        </svg>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Top Volunteers</h1>
        <p style={{ color: '#ffffffcc', fontSize: 13 }}>Pakistan's most impactful legal volunteers</p>
        {myRank && <div style={{ marginTop: 10, background: '#ffffff22', borderRadius: 20, padding: '6px 20px', display: 'inline-block', color: '#fff', fontSize: 13, fontWeight: 700 }}>Your Rank: #{myRank}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1.5px solid var(--border)' }}>
        {[['all', 'All Time'], ['month', 'This Month'], ['city', 'My City']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '13px', border: 'none', background: 'none', color: tab === k ? 'var(--primary)' : 'var(--muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', borderBottom: `3px solid ${tab === k ? 'var(--primary)' : 'transparent'}`, fontFamily: 'Poppins,sans-serif' }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: '16px 12px 80px', maxWidth: 680, margin: '0 auto' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</div> : (
          <>
            {/* Podium */}
            {leaders.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
                {[top3[1], top3[0], top3[2]].map((v, i) => {
                  if (!v) return <div key={i} />;
                  const rank = i === 1 ? 0 : i === 0 ? 1 : 2;
                  const name = v.users?.full_name || 'Volunteer';
                  const isMe = v.user_id === user?.id;
                  return (
                    <div key={v.id} onClick={() => navigate(`/profile/${v.user_id}`)} style={{ background: isMe ? 'linear-gradient(135deg,#f0e8ff,#ffe8f5)' : '#fff', borderRadius: 18, padding: '16px 8px 14px', textAlign: 'center', border: isMe ? '2px solid var(--primary)' : rank === 0 ? '2px solid #ffd700' : '1.5px solid var(--border)', cursor: 'pointer', boxShadow: rank === 0 ? '0 4px 24px rgba(255,215,0,0.35)' : 'var(--shadow)' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{medals[rank]}</div>
                      <LeaderboardAvatar name={name} src={v.profile_pic} size={rank === 0 ? 52 : 44} />
                      <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text)', marginTop: 8, marginBottom: 2 }}>{name.split(' ')[0]}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{v.location || 'PK'}</div>
                      <div style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(90deg,#7b2ff7,#ff0080)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{(v.points || 0).toLocaleString()}</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)' }}>pts</div>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ background: `${LEVEL_COLORS[v.level || 'Newbie']}18`, color: LEVEL_COLORS[v.level || 'Newbie'], borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>{v.level || 'Newbie'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rest list */}
            {rest.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid var(--border)', overflow: 'hidden', marginBottom: 20, boxShadow: 'var(--shadow)' }}>
                {rest.map((v, i) => {
                  const name = v.users?.full_name || 'Volunteer';
                  const isMe = v.user_id === user?.id;
                  return (
                    <div key={v.id} onClick={() => navigate(`/profile/${v.user_id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < rest.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: isMe ? 'var(--primary-light)' : 'transparent' }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--muted)', width: 28, textAlign: 'center' }}>#{i + 4}</span>
                      <LeaderboardAvatar name={name} src={v.profile_pic} size={38} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: isMe ? 'var(--primary)' : 'var(--text)' }}>{name} {isMe && '(You)'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.location || 'Pakistan'} · {v.hours || 0}h · <span style={{ color: LEVEL_COLORS[v.level || 'Newbie'], fontWeight: 700 }}>{v.level || 'Newbie'}</span></div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--primary)' }}>{(v.points || 0).toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {leaders.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 14 }}>No volunteers yet in this category</div>}

            {/* Challenges */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid var(--border)', padding: 18, marginBottom: 16, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 14 }}>Monthly Challenges</div>

              {challenges.length > 0 ? challenges.map(c => {
                const cfg = CHALLENGE_ACTIONS[c.title];
                const done = cfg ? (myProgress[cfg.action] || 0) : 0;
                const tgt = c.target || cfg?.target || 5;
                const pct = Math.min((done / tgt) * 100, 100);
                const comp = pct >= 100;
                return (
                  <div key={c.id} style={{ background: comp ? 'linear-gradient(135deg,#e8fff3,#f0fff8)' : 'linear-gradient(135deg,#f0e8ff,#ffe8f5)', borderRadius: 14, padding: 14, marginBottom: 12, border: `1.5px solid ${comp ? '#00c851' : 'var(--border)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: comp ? '#1b5e20' : 'var(--primary)', fontSize: 14, flex: 1, paddingRight: 8 }}>{c.title}</div>
                      <span style={{ background: comp ? '#00c851' : 'var(--primary)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{comp ? 'Done!' : '+' + (cfg?.pts || 30) + ' pts'}</span>
                    </div>
                    {c.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>{c.description}</div>}
                    <div style={{ background: comp ? '#c8e6c9' : 'var(--border)', borderRadius: 10, height: 8, marginBottom: 6 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: comp ? '#00c851' : 'linear-gradient(90deg,#7b2ff7,#ff0080)', borderRadius: 10, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                      <span>{done}/{tgt} completed</span>
                      <span>{comp ? 'Challenge complete!' : 'Keep going!'}</span>
                    </div>
                    {user && cfg && !comp && (
                      <button onClick={e => { e.stopPropagation(); awardPoints(cfg.action, cfg.pts); }} style={{ marginTop: 10, width: '100%', background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                        Mark Progress (+{cfg.pts} pts)
                      </button>
                    )}
                  </div>
                );
              }) : (
                [
                  { id: 'd1', title: 'Conduct 5 Awareness Sessions', description: 'Hold legal awareness sessions in your community', target: 5, pts: 50 },
                  { id: 'd2', title: 'Help 3 FIR Filings', description: 'Assist 3 people in filing their FIR correctly', target: 3, pts: 75 },
                  { id: 'd3', title: 'Respond to 5 Help Requests', description: 'Volunteer for 5 open help requests in your city', target: 5, pts: 60 },
                ].map(c => {
                  const cfg = CHALLENGE_ACTIONS[c.title.toLowerCase()] || CHALLENGE_ACTIONS[c.title];
                  const done = cfg ? (myProgress[cfg.action] || 0) : 0;
                  const pct = Math.min((done / c.target) * 100, 100);
                  const comp = pct >= 100;
                  return (
                    <div key={c.id} style={{ background: comp ? 'linear-gradient(135deg,#e8fff3,#f0fff8)' : 'linear-gradient(135deg,#f0e8ff,#ffe8f5)', borderRadius: 14, padding: 14, marginBottom: 12, border: '1.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, color: comp ? '#1b5e20' : 'var(--primary)', fontSize: 14, flex: 1, paddingRight: 8 }}>{c.title}</div>
                        <span style={{ background: comp ? '#00c851' : 'var(--primary)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>+{c.pts} pts</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{c.description}</div>
                      <div style={{ background: 'var(--border)', borderRadius: 10, height: 8, marginBottom: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#7b2ff7,#ff0080)', borderRadius: 10 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                        <span>{done}/{c.target} completed</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Points guide */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid var(--border)', padding: 18, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 14 }}>How to Earn Points</div>
              {[
                ['Create a post', '+10 pts'],
                ['Post gets liked', '+2 pts'],
                ['Post gets commented', '+1 pt'],
                ['Claim a help request slot', '+100 pts'],
                ['Complete a challenge', '+30–80 pts'],
                ['Get verified', '+50 pts'],
                ['Recruit a volunteer', '+80 pts'],
              ].map(([action, pts]) => (
                <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{action}</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 13 }}>{pts}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
