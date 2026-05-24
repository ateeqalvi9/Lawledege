import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';

const ALL_SKILLS = ['Legal Awareness','First Aid','Cyber Security','FIR Filing','Court Support',"Women's Rights",'Mental Health','Document Drafting'];
const CITIES = ['Lahore','Karachi','Islamabad','Rawalpindi','Multan','Faisalabad','Peshawar','Quetta'];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(1);
  const [role, setRole]   = useState('');   // 'volunteer' | 'user'
  const [form, setForm]   = useState({ name:'', email:'', password:'', phone:'', cnic:'', city:'', bio:'', skills:[] });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k,v) => setForm(p => ({...p,[k]:v}));
  const toggleSkill = s => set('skills', form.skills.includes(s) ? form.skills.filter(x=>x!==s) : [...form.skills, s]);

  // Navigation logic between multi-step forms
  const next = () => {
    setError('');
    if (step === 1) {
      if (!role)              { setError('Please choose a role'); return; }
    }
    if (step === 2) {
      if (!form.name.trim()) { setError('Name is required'); return; }
      if (!form.email.trim()){ setError('Email is required'); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    }
    setStep(s => s + 1);
  };

  // Core registration workflow
  const register = async () => {
    setLoading(true); setError('');
    try {
      /* 1 — create auth user */
      const { data, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { 
          data: { 
            full_name: form.name.trim(), 
            role,
            phone: form.phone.trim() || null,
            cnic: form.cnic.trim() || null,
            city: form.city || null,
            bio: form.bio.trim() || null,
            skills: form.skills.length ? form.skills : null
          } 
        }
      });
      if (authErr) throw authErr;

      if (data.user?.identities?.length === 0)
        throw new Error('Email already registered — please login.');

      const uid = data.user?.id;
      if (!uid) { setStep(99); setLoading(false); return; }

      // If email confirmation is required, session will be null.
      // We CANNOT insert into public tables yet due to RLS.
      // The profile will be completed upon first login via AuthContext.
      if (!data.session) {
        setStep(99);
        setLoading(false);
        return;
      }

      /* 2 — insert into public.users (uses service-role bypass via RLS policy) */
      const { error: userErr } = await supabase.from('users').upsert({
        id: uid,
        full_name: form.name.trim(),
        phone: form.phone.trim() || null,
        cnic:  form.cnic.trim()  || null,
        is_volunteer: role === 'volunteer',
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (userErr) throw userErr;

      /* 3 — insert volunteer_profiles (for both roles — users get minimal profile) */
      const { error: vpErr } = await supabase.from('volunteer_profiles').upsert({
        user_id:      uid,
        bio:          form.bio.trim() || null,
        skills:       form.skills.length ? form.skills : null,
        location:     form.city || null,
        level:        role === 'volunteer' ? 'Newbie' : null,
        availability: role === 'volunteer' ? 'Available' : null,
        points:       0,
        impact_score: 0,
        hours:        0,
        show_contact: true,
      }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (vpErr) throw vpErr;

      navigate('/feed');
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Reusable input component for cleaner JSX
  const inp = (label, key, type='text', placeholder='') => (
    <div key={key} style={{ marginBottom:14 }}>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>{label}</div>
      <input type={type} value={form[key]} placeholder={placeholder}
        onChange={e => set(key, e.target.value)}
        style={{ width:'100%', border:'1.5px solid var(--border)', borderRadius:14, padding:'13px 16px', fontSize:14, background:'#fff', color:'var(--text)', fontFamily:'Poppins,sans-serif', boxSizing:'border-box' }}
      />
    </div>
  );

  const totalSteps = role === 'volunteer' ? 4 : 3;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* Step Visualization Header */}
      <div style={{ background:'linear-gradient(135deg,#7b2ff7,#ff0080)', padding:'48px 24px 60px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'#ffffff10' }}/>
        <div style={{ marginBottom:12 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 7l4 9h10l4-9-9-5z"/><line x1="12" y1="22" x2="12" y2="16"/>
          </svg>
        </div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontWeight:800, fontSize:28, color:'#fff', marginBottom:6 }}>Join Lawledge</h1>
        <p style={{ color:'#ffffffcc', fontSize:13 }}>
          {step===1 ? 'Choose how you want to join' : step===2 ? 'Create your account' : step===3 ? 'Your location' : 'Your expertise'}
        </p>
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20 }}>
          {Array.from({length:totalSteps}).map((_,i) => (
            <div key={i} style={{ height:8, borderRadius:4, background:i+1<=step?'#fff':'#ffffff33', width:i+1===step?32:8, transition:'all 0.3s' }}/>
          ))}
        </div>
        <div style={{ position:'absolute', bottom:-28, left:'50%', transform:'translateX(-50%)', width:'150%', height:56, background:'var(--bg)', borderRadius:'50% 50% 0 0' }}/>
      </div>

      <div style={{ padding:'32px 24px', maxWidth:420, margin:'0 auto' }}>

        {/* Step 1 — Role selection */}
        {step===1 && (
          <>
            <h3 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:8 }}>I want to join as…</h3>
            <p style={{ fontSize:13, color:'var(--muted)', marginBottom:24, lineHeight:1.7 }}>
              Choose your role. You can always upgrade later.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { key:'volunteer', title:'Volunteer', desc:'Create posts, resolve help requests, earn badges & appear on leaderboard', icon:'⚖️', color:'#7b2ff7' },
                { key:'user',      title:'Regular User', desc:'Browse posts, create help requests, follow volunteers & message them', icon:'👤', color:'#ff0080' },
              ].map(r => (
                <div key={r.key} onClick={() => setRole(r.key)} style={{ border:`2px solid ${role===r.key?r.color:'var(--border)'}`, borderRadius:18, padding:'18px 16px', cursor:'pointer', background:role===r.key?`${r.color}0d`:'#fff', transition:'all 0.2s', display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:`${r.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{r.icon}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16, color:role===r.key?r.color:'var(--text)', marginBottom:4 }}>{r.title}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>{r.desc}</div>
                  </div>
                  {role===r.key && (
                    <div style={{ marginLeft:'auto', flexShrink:0, width:22, height:22, borderRadius:'50%', background:r.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 2 — Basic info */}
        {step===2 && (
          <>
            <h3 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:20 }}>Basic Information</h3>
            {inp('Full Name *',    'name',     'text',     'Ayesha Malik')}
            {inp('Email Address *','email',    'email',    'your@email.com')}
            {inp('Password * (min 6)','password','password','••••••••')}
            {inp('Phone Number',  'phone',    'tel',      '+92 300 1234567')}
          </>
        )}

        {/* Step 3 — Location */}
        {step===3 && (
          <>
            <h3 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:20 }}>Your Location</h3>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:10 }}>Select City</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {CITIES.map(c => (
                  <button key={c} onClick={() => set('city',c)} style={{ padding:'8px 16px', borderRadius:20, border:`2px solid ${form.city===c?'var(--primary)':'var(--border)'}`, background:form.city===c?'var(--primary-light)':'transparent', color:form.city===c?'var(--primary)':'var(--muted)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                    {form.city===c?'✓ ':''}{c}
                  </button>
                ))}
              </div>
            </div>
            {inp('CNIC (optional)','cnic','text','35202-XXXXXXX-X')}
          </>
        )}

        {/* Step 4 — Skills + Bio (volunteers only) */}
        {step===4 && role==='volunteer' && (
          <>
            <h3 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:20 }}>Your Expertise</h3>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:10 }}>Skills (select all that apply)</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {ALL_SKILLS.map(s => (
                  <button key={s} onClick={() => toggleSkill(s)} style={{ padding:'7px 14px', borderRadius:20, border:`2px solid ${form.skills.includes(s)?'var(--primary)':'var(--border)'}`, background:form.skills.includes(s)?'var(--primary-light)':'transparent', color:form.skills.includes(s)?'var(--primary)':'var(--muted)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
                    {form.skills.includes(s)?'✓ ':''}{s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>Bio</div>
              <textarea value={form.bio} onChange={e => set('bio',e.target.value)} rows={4}
                placeholder="I'm passionate about legal rights awareness..."
                style={{ width:'100%', border:'1.5px solid var(--border)', borderRadius:14, padding:'13px 16px', fontSize:14, background:'#fff', color:'var(--text)', fontFamily:'Poppins,sans-serif', resize:'none', boxSizing:'border-box' }}
              />
            </div>
          </>
        )}

        {/* Email confirmation screen */}
        {step===99 && (
          <div style={{ textAlign:'center', padding:'10px 0' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#7b2ff7,#ff0080)', margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:10 }}>Check your email!</h3>
            <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.7, marginBottom:6 }}>Confirmation sent to:</p>
            <p style={{ fontWeight:800, color:'var(--primary)', fontSize:16, marginBottom:16 }}>{form.email}</p>
            <div style={{ background:'#fff8e8', border:'1.5px solid #ffd700', borderRadius:14, padding:'14px 16px', marginBottom:24, textAlign:'left' }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#92400e', marginBottom:6 }}>Skip email confirmation:</div>
              <div style={{ fontSize:12, color:'#92400e', lineHeight:1.8 }}>
                Supabase Dashboard → Authentication → Settings → turn OFF "Enable email confirmations"
              </div>
            </div>
            <button className="btn-rainbow" onClick={() => navigate('/login')}>Go to Login</button>
          </div>
        )}

        {error && step!==99 && (
          <div style={{ background:'#ffe8e8', color:'#c62828', borderRadius:12, padding:'10px 14px', fontSize:13, marginBottom:16, marginTop:8 }}>{error}</div>
        )}

        {step < 99 && (
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            {step > 1 && (
              <button className="btn-outline" onClick={() => { setError(''); setStep(s=>s-1); }} style={{ flex:1 }}>Back</button>
            )}
            {step < totalSteps ? (
              <button className="btn-rainbow" onClick={next} style={{ flex:2 }}>Continue →</button>
            ) : (
              <button className="btn-rainbow" onClick={register} disabled={loading} style={{ flex:2, opacity:loading?0.7:1 }}>
                {loading ? 'Creating account...' : `Join as ${role==='volunteer'?'Volunteer':'User'}`}
              </button>
            )}
          </div>
        )}

        {step < 99 && (
          <p style={{ textAlign:'center', fontSize:13, color:'var(--muted)', marginTop:24 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>Sign In</Link>
          </p>
        )}
      </div>
    </div>
  );
}
