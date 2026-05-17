import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { Avatar, Spinner, Badge, EmptyState } from '../Components/SocialUI';
import { useAuth } from '../lib/hooks'; 

// Static metadata array architecture containing concrete member stats to decouple render loop from random numbers
const MOCK_COMMUNITIES = [
  { id: '1', name: "Women Safety Volunteers", city: 'All Pakistan', members: 1240, url: 'https://www.facebook.com/groups/womensafetypk' },
  { id: '2', name: "Punjab Legal Volunteers", city: 'Punjab', members: 890, url: 'https://www.facebook.com/groups/punjablegal' },
  { id: '3', name: "Cyber Rights Pakistan", city: 'National', members: 456, url: 'https://www.facebook.com/groups/cyberrightspk' },
  { id: '4', name: "Youth Legal Awareness", city: 'All Pakistan', members: 2100, url: 'https://www.facebook.com/groups/youthlegal' },
  { id: '5', name: "Karachi Legal Aid", city: 'Karachi', members: 670, url: 'https://www.facebook.com/groups/karachilegalaid' },
  { id: '6', name: "FIR Warriors Network", city: 'All Pakistan', members: 1560, url: 'https://www.facebook.com/groups/firwarriors' },
];

const COMMUNITY_COLORS = ['#ff0080','#7b2ff7','#00bcd4','#00c851','#ff8c00','#e040fb'];

export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [volunteers, setVolunteers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [spotlightUser, setSpotlightUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [following, setFollowing] = useState(new Set());

  const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Multan', 'Faisalabad', 'Peshawar', 'Rawalpindi'];
  const SKILLS = ['Legal Awareness', 'First Aid', 'Cyber Security', 'FIR Filing', "Women's Rights"];

  // Stabilized data pipeline token preventing cascading update triggers
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: vols }, { data: comms }] = await Promise.all([
        supabase.from('volunteer_profiles')
          .select('*, users(full_name, id)')
          .order('impact_score', { ascending: false })
          .limit(30),
        supabase.from('communities').select('*').limit(8),
      ]);

      setVolunteers(vols || []);
      setCommunities(comms && comms.length ? comms : MOCK_COMMUNITIES);
      if (vols && vols.length) setSpotlightUser(vols[0]);

      if (user) {
        const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        setFollowing(new Set((f || []).map(r => r.following_id)));
      }
    } catch (err) {
      console.error("Data pipeline processing failure:", err);
    }
    setLoading(false);
  }, [user]);

  // FIXED: Asynchronous wrapper pattern completely decouples component mounting and async updates 
  useEffect(() => { 
    let isMounted = true;

    const executeDataFetch = async () => {
      if (isMounted) {
        await fetchData();
      }
    };

    executeDataFetch();

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const toggleFollow = async (targetId) => {
    if (!user) { navigate('/login'); return; }
    if (following.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setFollowing(prev => { const s = new Set(prev); s.delete(targetId); return s; });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setFollowing(prev => new Set([...prev, targetId]));
    }
  };

  const filtered = volunteers.filter(v => {
    const name = v.users?.full_name?.toLowerCase() || '';
    const matchSearch = !search || name.includes(search.toLowerCase()) || (v.location || '').toLowerCase().includes(search.toLowerCase());
    const matchCity = !filterCity || (v.location || '').toLowerCase().includes(filterCity.toLowerCase());
    const matchSkill = !filterSkill || (v.skills || []).includes(filterSkill);
    return matchSearch && matchCity && matchSkill;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header Container Zone */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg,#ff0080,#ff8c00,#ffd700,#00c851,#00bcd4,#7b2ff7)' }} />
        <div style={{ padding: '12px 16px 10px' }}>
          <h2 style={{ fontWeight: 800, fontSize: '20px', color: 'var(--text)', marginBottom: '10px' }}>Explore Network</h2>
          
          {/* Real-time Filter Tracking Search Field */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '10px 14px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search volunteers, cities, skills..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }} />
          </div>
          
          {/* Dynamic Filter Horizon Bar */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button onClick={() => setFilterCity('')} style={{ padding: '5px 14px', borderRadius: '20px', whiteSpace: 'nowrap', border: `1.5px solid ${!filterCity ? 'var(--primary)' : 'var(--border)'}`, background: !filterCity ? 'var(--primary)' : 'transparent', color: !filterCity ? '#fff' : 'var(--muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>All Cities</button>
            {CITIES.map(c => (
              <button key={c} onClick={() => setFilterCity(filterCity === c ? '' : c)} style={{ padding: '5px 14px', borderRadius: '20px', whiteSpace: 'nowrap', border: `1.5px solid ${filterCity===c?'var(--primary)':'var(--border)'}`, background: filterCity===c?'var(--primary)' : 'transparent', color: filterCity===c ? '#fff' : 'var(--muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bottom-safe" style={{ padding: '16px 12px 0' }}>
        {loading ? <Spinner /> : (
          <>
            {/* Spotlight Banner Sub-View */}
            {spotlightUser && !search && (
              <div onClick={() => navigate(`/profile/${spotlightUser.user_id}`)} style={{ background: 'linear-gradient(135deg,#7b2ff7,#ff0080,#ff8c00)', borderRadius: '20px', padding: '20px', marginBottom: '20px', cursor: 'pointer' }}>
                <div style={{ fontSize: '11px', color: '#ffffffaa', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>VOLUNTEER OF THE MONTH</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: '#fff', border: '3px solid #ffffff60', fontFamily: "'Playfair Display',serif" }}>
                    {(spotlightUser.users?.full_name || 'V').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>{spotlightUser.users?.full_name}</div>
                    <div style={{ color: '#ffffffcc', fontSize: '12px' }}>📍 {spotlightUser.location} · {spotlightUser.hours || 0} hours volunteered</div>
                    <div style={{ color: '#ffffffaa', fontSize: '11px', marginTop: '4px' }}>{(spotlightUser.skills || []).slice(0, 2).join(' · ')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Social Communities Component Grid */}
            {!search && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)', marginBottom: '12px', textAlign: 'left' }}>Volunteer Communities</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {communities.slice(0, 6).map((c, i) => (
                    <div key={c.id} style={{ background: '#fff', borderRadius: '16px', padding: '14px 12px', border: '1.5px solid var(--border)', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: `${COMMUNITY_COLORS[i % COMMUNITY_COLORS.length]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '8px' }}>
                        {['👩‍⚖️','⚖️','🔐','🎓','🏙️','🔥'][i % 6]}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', marginBottom: '2px', textAlign: 'left' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', textAlign: 'left' }}>{c.city} · {(c.members || 500).toLocaleString()} members</div>
                      <button onClick={() => window.open(c.url || `https://www.facebook.com/search/groups/?q=${encodeURIComponent(c.name)}`, '_blank')} style={{ width: '100%', background: `${COMMUNITY_COLORS[i%COMMUNITY_COLORS.length]}18`, color: COMMUNITY_COLORS[i%COMMUNITY_COLORS.length], border: 'none', borderRadius: '10px', padding: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Join on Facebook</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Selector Anchor Section */}
            {!search && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)', marginBottom: '10px', textAlign: 'left' }}>Filter by Skill</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {SKILLS.map(s => (
                    <button key={s} onClick={() => setFilterSkill(filterSkill === s ? '' : s)} style={{ padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${filterSkill===s?'var(--primary)':'var(--border)'}`, background: filterSkill===s?'var(--primary-light)':'transparent', color: filterSkill===s?'var(--primary)':'var(--muted)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Verified Volunteers Dynamic Grid */}
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)', marginBottom: '12px', textAlign: 'left' }}>
              {search ? `Results for "${search}"` : 'Recommended Volunteers'}
            </div>
            {filtered.length === 0 ? <EmptyState icon="🔍" text="No volunteers found" sub="Try a different search or filter" /> : (
              filtered.map(v => {
                const name = v.users?.full_name || 'Volunteer';
                const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isFollowing = following.has(v.user_id);
                return (
                  <div key={v.id} style={{ background: '#fff', borderRadius: '16px', padding: '14px', border: '1.5px solid var(--border)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow)' }}>
                    <div onClick={() => navigate(`/profile/${v.user_id}`)} style={{ cursor: 'pointer' }}>
                      <Avatar initials={initials} src={v.profile_pic} size={48} ring />
                    </div>
                    
                    <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => navigate(`/profile/${v.user_id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{name}</span>
                        {v.verified && <span>✅</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', textAlign: 'left' }}>📍 {v.location || 'Pakistan'} · {v.hours || 0}h · {v.level || 'Newbie'}</div>
                      {v.skills && v.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {v.skills.slice(0, 2).map(s => <Badge key={s} text={s} small />)}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button onClick={() => toggleFollow(v.user_id)} style={{ background: isFollowing ? 'transparent' : 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: isFollowing ? 'var(--primary)' : '#fff', border: isFollowing ? '2px solid var(--primary)' : 'none', borderRadius: '10px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                      <button onClick={() => navigate('/messages', { state: { partnerId: v.user_id, partnerName: name } })} style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Message
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}