import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/hooks'; // Kept clean single hooks anchor
import { supabase } from '../api/supabaseClient'; // Kept clean monolithic public database path
import { Badge, Spinner, EmptyState } from '../Components/SocialUI';
import PostCard from '../Components/PostCard';

const LEVEL_THRESHOLDS = { Newbie: 0, Active: 100, Leader: 500, Legend: 1000 };

const BADGES_INFO = [
  { id: 'fir',        label: 'FIR Warrior',    desc: '10+ FIRs filed',      color: '#ff1744', bg: '#ffe8e8' },
  { id: '100h',       label: '100 Hours Hero', desc: '100 hours contributed', color: '#ff8c00', bg: '#fff3e0' },
  { id: 'women',      label: 'Women Guardian', desc: '50 women helped',       color: '#e040fb', bg: '#fce4ec' },
  { id: 'legend',     label: 'Legend',         desc: '500+ hours',            color: '#ffd700', bg: '#fffde7' },
  { id: 'impact',     label: 'Impact Maker',   desc: '1000 people reached',   color: '#00bcd4', bg: '#e0f7fa' },
  { id: 'awareness',  label: 'Awareness Guru', desc: '30 sessions done',      color: '#00c851', bg: '#e8f5e9' },
];

const SKILLS_ALL = ['Legal Awareness', 'First Aid', 'Cyber Security', 'FIR Filing', 'Court Support', "Women's Rights", 'Mental Health', 'Document Drafting'];

export default function Profile() {
  const { user, profile: refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const isOwn = !userId || userId === user?.id;
  const targetId = userId || user?.id;
  const fileRef = useRef(null);
  const coverRef = useRef(null);

  const [profileData, setProfileData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // FIXED: Memoized callback pipeline ensures absolute layout data stability
  const fetchProfile = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [vpRes, uRes, postsRes, follRes, follwRes] = await Promise.all([
        supabase.from('volunteer_profiles').select('*').eq('user_id', targetId).maybeSingle(),
        supabase.from('users').select('*').eq('id', targetId).maybeSingle(),
        supabase.from('posts').select('*, users(full_name), volunteer_profiles(profile_pic,location,verified,level)').eq('user_id', targetId).eq('is_draft', false).order('created_at', { ascending: false }).limit(20),
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', targetId),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', targetId),
      ]);

      setProfileData(vpRes.data);
      setUserData(uRes.data);
      setPosts(postsRes.data || []);
      setFollowerCount(follRes.count || 0);
      setFollowingCount(follwRes.count || 0);

      if (vpRes.data) {
        setEditForm({ 
          bio: vpRes.data.bio || '', 
          location: vpRes.data.location || '', 
          availability: vpRes.data.availability || 'Available', 
          skills: vpRes.data.skills || [], 
          show_contact: !!vpRes.data.show_contact 
        });
      }

      if (user && !isOwn) {
        const { data: f } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', targetId).maybeSingle();
        setIsFollowing(!!f);
      }
    } catch (err) {
      console.error('Failed to capture targeted profile metadata maps:', err);
    }
    setLoading(false);
  }, [targetId, user, isOwn]);

  // FIXED: Safe transactional runtime block isolates mount execution loops
  useEffect(() => { 
    let isMounted = true;
    
    const executeInit = async () => {
      if (isMounted) {
        await fetchProfile();
      }
    };

    executeInit();
    return () => {
      isMounted = false;
    };
  }, [fetchProfile]);

  const toggleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setIsFollowing(false); 
      setFollowerCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setIsFollowing(true); 
      setFollowerCount(c => c + 1);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    await supabase.from('volunteer_profiles').update({
      bio: editForm.bio, 
      location: editForm.location,
      availability: editForm.availability, 
      skills: editForm.skills,
      show_contact: editForm.show_contact,
    }).eq('user_id', user.id);
    await refreshProfile();
    setEditing(false); 
    setSaving(false); 
    fetchProfile();
  };

  const handlePhotoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${type}-${Date.now()}.${ext}`;
    const bucket = type === 'profile' ? 'profile-pics' : 'cover-photos';
    
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (upErr) { 
      console.error(upErr); 
      setUploading(false); 
      return; 
    }
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    const field = type === 'profile' ? 'profile_pic' : 'cover_photo';
    await supabase.from('volunteer_profiles').update({ [field]: publicUrl }).eq('user_id', user.id);
    
    await refreshProfile(); 
    fetchProfile();
    setUploading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!targetId && !user) { navigate('/login'); return null; }
  
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );

  const name = userData?.full_name || 'Volunteer';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const points = profileData?.points || 0;
  const hours = profileData?.hours || 0;
  const level = profileData?.level || 'Newbie';
  const nextLevel = { Newbie: 'Active', Active: 'Leader', Leader: 'Legend', Legend: 'Legend' }[level];
  const nextThreshold = LEVEL_THRESHOLDS[nextLevel] || 1000;
  const progress = Math.min((points / Math.max(nextThreshold, 1)) * 100, 100);
  const isVolunteer = userData?.is_volunteer;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Cover photo */}
      <div style={{ position: 'relative', height: 200 }}>
        {profileData?.cover_photo
          ? <img src={profileData.cover_photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="cover" />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#7b2ff7,#ff0080,#ff8c00)' }} />
        }
        {/* Overlay buttons */}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#0006', border: 'none', borderRadius: 10, padding: '7px 14px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, backdropFilter: 'blur(8px)' }}>← Back</button>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
          {isOwn && (
            <>
              <button onClick={() => coverRef.current?.click()} style={{ background: '#0006', border: 'none', borderRadius: 10, padding: '7px 14px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, backdropFilter: 'blur(8px)' }}>
                {uploading ? '...' : 'Cover'}
              </button>
              <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'cover')} />
              <button onClick={() => setShowLogout(true)} style={{ background: '#ff174499', border: 'none', borderRadius: 10, padding: '7px 14px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, backdropFilter: 'blur(8px)' }}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* FIXED: Removed duplicate 'marginTop' key specification error from object properties */}
      <div style={{ padding: '0 16px', marginBottom: 16, maxWidth: 600, margin: '0 auto', marginTop: -48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
          {/* Avatar with upload */}
          <div style={{ position: 'relative' }}>
            <div style={{ padding: 3, background: 'linear-gradient(135deg,#7b2ff7,#ff0080,#ff8c00)', borderRadius: '50%', boxShadow: '0 4px 20px rgba(123,47,247,0.4)' }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: profileData?.profile_pic ? 'transparent' : '#7b2ff722', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'var(--primary)', overflow: 'hidden', fontFamily: "'Playfair Display',serif" }}>
                {profileData?.profile_pic
                  ? <img src={profileData.profile_pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
                  : initials
                }
              </div>
            </div>
            {isOwn && (
              <>
                <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, 'profile')} />
              </>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            {isOwn ? (
              <button onClick={() => setEditing(true)} style={{ background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                Edit Profile
              </button>
            ) : user ? (
              <>
                <button onClick={toggleFollow} style={{ background: isFollowing ? 'transparent' : 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: isFollowing ? 'var(--primary)' : '#fff', border: isFollowing ? '2px solid var(--primary)' : 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button onClick={() => navigate('/messages', { state: { partnerId: targetId, partnerName: name } })} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Message
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} style={{ background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Follow</button>
            )}
          </div>
        </div>

        {/* Name + info */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h1 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>{name}</h1>
            {profileData?.verified && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            )}
            <span style={{ background: isVolunteer ? '#f0e8ff' : '#e8fff3', color: isVolunteer ? '#7b2ff7' : '#1b5e20', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              {isVolunteer ? 'Volunteer' : 'User'}
            </span>
            {isVolunteer && level && (
              <span style={{ background: 'linear-gradient(135deg,#7b2ff722,#ff008022)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{level}</span>
            )}
          </div>

          {profileData?.location && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6, textAlign: 'left' }}>📍 {profileData.location}</div>}

          {profileData?.availability && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: profileData.availability === 'Available' ? '#e8fff3' : '#fff3e0', color: profileData.availability === 'Available' ? '#1b5e20' : '#e65100', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: profileData.availability === 'Available' ? '#00c851' : '#ff8c00' }} />
              {profileData.availability}
            </div>
          )}

          {profileData?.bio && <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 10, textAlign: 'left' }}>{profileData.bio}</p>}

          {profileData?.skills?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '10px' }}>
              {profileData.skills.map(s => <Badge key={s} text={s} />)}
            </div>
          )}

          {profileData?.show_contact && userData?.phone && (
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'left' }}>📞 {userData.phone}</div>
          )}

          {/* Followers row */}
          <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Followers', value: followerCount },
              { label: 'Following', value: followingCount },
              { label: 'Posts', value: posts.length },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats — volunteers only */}
        {isVolunteer && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Hours', value: hours, color: '#ff8c00', bg: '#fff3e0' },
              { label: 'Points', value: points, color: '#7b2ff7', bg: '#f0e8ff' },
              { label: 'Impact', value: profileData?.impact_score || 0, color: '#00c851', bg: '#e8fff3' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: '14px 10px', textAlign: 'center', border: `1.5px solid ${s.color}22` }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Level bar — volunteers only */}
        {isVolunteer && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1.5px solid var(--border)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Level: {level}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{points}/{nextThreshold} pts → {nextLevel}</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 10, height: 10, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#7b2ff7,#ff0080,#ff8c00)', borderRadius: 10, transition: 'width 0.6s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['Newbie', 'Active', 'Leader', 'Legend'].map(l => (
                <span key={l} style={{ fontSize: 10, color: l === level ? 'var(--primary)' : 'var(--muted)', fontWeight: l === level ? 700 : 400 }}>{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {profileData?.badges?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1.5px solid var(--border)', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12, textAlign: 'left' }}>Badges Earned</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {BADGES_INFO.filter(b => profileData.badges.includes(b.id)).map(b => (
                <div key={b.id} style={{ background: b.bg, borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center', border: `1px solid ${b.color}33` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${b.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={b.color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: b.color }}>{b.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Posts tab */}
      <div style={{ background: '#fff', borderBottom: '1.5px solid var(--border)', display: 'flex', maxWidth: 600, margin: '0 auto' }}>
        {['posts', ...((isOwn) ? ['saved'] : [])].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '14px', border: 'none', background: 'none', color: activeTab === tab ? 'var(--primary)' : 'var(--muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer', borderBottom: `3px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`, textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bottom-safe" style={{ padding: '0 12px', maxWidth: 600, margin: '0 auto', marginTop: 14 }}>
        {posts.length === 0
          ? <EmptyState icon="📝" text="No posts yet" sub={isOwn ? "Share your first post!" : "This volunteer hasn't posted yet"} />
          : posts.map(p => <PostCard key={p.id} post={p} />)
        }
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: '#0009', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setEditing(false)}>
          <div className="slide-up" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>Edit Profile</span>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            {[{ label: 'Bio', key: 'bio', multi: true }, { label: 'Location / City', key: 'location' }].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textAlign: 'left' }}>{f.label}</div>
                {f.multi
                  ? <textarea value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} rows={3} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: '11px 14px', fontSize: 14, background: 'var(--bg)', resize: 'none', boxSizing: 'border-box' }} />
                  : <input value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 12, padding: '11px 14px', fontSize: 14, background: 'var(--bg)', boxSizing: 'border-box' }} />
                }
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textAlign: 'left' }}>Availability</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Available', 'Busy', 'On Leave'].map(a => (
                  <button key={a} onClick={() => setEditForm(p => ({ ...p, availability: a }))} style={{ padding: '7px 14px', borderRadius: 20, border: `2px solid ${editForm.availability === a ? 'var(--primary)' : 'var(--border)'}`, background: editForm.availability === a ? 'var(--primary-light)' : 'transparent', color: editForm.availability === a ? 'var(--primary)' : 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{a}</button>
                ))}
              </div>
            </div>

            {isVolunteer && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textAlign: 'left' }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SKILLS_ALL.map(s => {
                    const on = (editForm.skills || []).includes(s);
                    return <button key={s} onClick={() => setEditForm(p => ({ ...p, skills: on ? p.skills.filter(x => x !== s) : [...(p.skills || []), s] }))} style={{ padding: '5px 12px', borderRadius: 20, border: `2px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-light)' : 'transparent', color: on ? 'var(--primary)' : 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{on ? '✓ ' : ''}{s}</button>;
                  })}
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <div style={{ width: 40, height: 22, borderRadius: 11, background: editForm.show_contact ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }} onClick={() => setEditForm(p => ({ ...p, show_contact: !p.show_contact }))}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: editForm.show_contact ? 20 : 2, transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Show phone number on profile</span>
            </label>

            <button onClick={saveProfile} disabled={saving} className="btn-rainbow" style={{ opacity: saving ? 0.7 : 1, width: '100%', padding: 12 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Logout confirm */}
      {showLogout && (
        <div style={{ position: 'fixed', inset: 0, background: '#0009', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowLogout(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ffe8e8', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff1744" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Log out?</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>You will be returned to the login screen.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLogout(false)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleLogout} style={{ flex: 1, background: '#ff1744', color: '#fff', border: 'none', borderRadius: 14, padding: '12px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}