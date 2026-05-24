import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../lib/hooks';
import { Spinner, EmptyState } from '../Components/SocialUI';
import ReviewModal from "../Components/ReviewModal";
import Toast from "../Components/ui/Toast";
import { DEPARTMENT_DIRECTORY } from "../lib/whatsappSender"; 
import "./AdminDashboard.css"; 

const ADMIN_EMAIL = 'admin@lawledge.pk';

const TAB_ITEMS = [
  { key: 'complaints', label: 'Complaints Portal', icon: '⚖️' },
  { key: 'reports',    label: 'Infraction Reports', icon: '🚨' },
  { key: 'posts',      label: 'User Content', icon: '📝' },
  { key: 'users',      label: 'Volunteer Ledger', icon: '👥' },
  { key: 'help',       label: 'SOS Inquiries', icon: '🆘' },
];

const STAT_ITEMS = (complaints, users, helpReqs, reports, posts) => [
  { label: 'Complaints', icon: '⚖️', value: complaints.length },
  { label: 'Network Users', icon: '👥', value: users.length },
  { label: 'SOS Open', icon: '🆘', value: helpReqs.filter(x => x.status === 'open').length },
  { label: 'Alert Ticks', icon: '⚠️', value: reports.length },
  { label: 'Active Posts', icon: '📝', value: posts.length },
];

/* Helper to resolve directory mismatches caused by whitespace or formatting */
const getDepartmentPhone = (authorityName) => {
  if (!authorityName) return "";
  const entry = DEPARTMENT_DIRECTORY[authorityName.trim()];
  if (!entry) return "";
  let cleaned = entry.phone.toString().replace(/\D/g, "");
  return cleaned.startsWith("0") ? "92" + cleaned.substring(1) : cleaned;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('complaints');
  const [complaints, setComplaints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [reports, setReports]   = useState([]);
  const [posts, setPosts]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [helpReqs, setHelpReqs] = useState([]);
  const [loading, setLoading]   = useState(false);

  // Security: Restrict page to admin only
  useEffect(() => {
    if (user === undefined) return;
    if (user && user.email !== ADMIN_EMAIL) navigate('/feed', { replace: true });
  }, [user, navigate]);
  // Fetch all administrative data buckets
  const fetchAllDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [complaintsRes, reportsRes, postsRes, usersRes, helpRes] = await Promise.all([
        supabase.from("complaints").select("*").order("created_at", { ascending: false }),
        supabase.from('reports').select('*, users!reported_by(full_name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('posts').select('*, users(full_name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('users').select('*, volunteer_profiles(level,points,verified)').order('created_at', { ascending: false }).limit(50),
        supabase.from('help_requests').select('*').order('created_at', { ascending: false }).limit(30),
      ]);
      if (complaintsRes.data) setComplaints(complaintsRes.data);
      setReports(reportsRes.data || []);
      setPosts(postsRes.data || []);
      setUsers(usersRes.data || []);
      setHelpReqs(helpRes.data || []);
    } catch (err) {
      setToast({ type: "error", message: "Database sync failed." });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAllDashboardData(); }, [fetchAllDashboardData]);

  // Local search and filter processing for complaints
  const filteredComplaints = complaints.filter(c => {
    const matchesStatus = activeFilter === "all" || c.status === activeFilter;
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (c.tracking_code?.toLowerCase().includes(lowerSearch)) ||
      (c.complainant_name?.toLowerCase().includes(lowerSearch));
    return matchesStatus && matchesSearch;
  });

  // Administrative Actions
  async function handleApprove(id) {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;
    const { error } = await supabase.from("complaints").update({ status: 'approved' }).eq("id", id);
    if (error) { setToast({ type: "error", message: `Approval failed: ${error.message}` }); }
    else { setToast({ type: "success", message: "Complaint approved." }); fetchAllDashboardData(); }
    setSelected(null);
  }

  async function handlePurge(id, filePath) {
    if (!confirm("This will permanently delete the complaint record. Are you sure?")) return;
    await supabase.storage.from('evidence').remove([filePath]);
    const { error } = await supabase.from("complaints").delete().eq("id", id);
    if (!error) { setToast({ type: "success", message: "Complaint record purged." }); fetchAllDashboardData(); }
    else { setToast({ type: "error", message: `Purge failed: ${error.message}` }); }
    setSelected(null);
  }

  const deletePost    = async (id) => { await supabase.from('posts').delete().eq('id', id); setPosts(p => p.filter(x => x.id !== id)); };
  const verifyUser    = async (uid, v) => { await supabase.from('volunteer_profiles').update({ verified: v }).eq('user_id', uid); fetchAllDashboardData(); };
  const closeHelp     = async (id) => { await supabase.from('help_requests').update({ status: 'closed' }).eq('id', id); setHelpReqs(p => p.map(h => h.id === id ? { ...h, status: 'closed' } : h)); };
  const dismissReport = async (id) => { await supabase.from('reports').delete().eq('id', id); setReports(p => p.filter(r => r.id !== id)); };

  const statItems = STAT_ITEMS(complaints, users, helpReqs, reports, posts);

  const filterPillClass = (f) => {
    if (activeFilter !== f) return "filter-pill";
    return `filter-pill active-${f}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Hero Banner */}
      <div className="admin-hero">
        <div className="admin-hero-top">
          <div>
            <h1 className="admin-hero-title">⚖️ Command Control Center</h1>
            <p className="admin-hero-sub">Lawledge Administration Dashboard</p>
          </div>
          <button className="btn-leave" onClick={() => navigate('/', { replace: true })}>← Leave Panel</button>
        </div>
        <div className="admin-stats-grid">
          {statItems.map(s => (
            <div key={s.label} className="admin-stat-card">
              <span className="admin-stat-icon">{s.icon}</span>
              <span className="admin-stat-value">{s.value}</span>
              <span className="admin-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="admin-tab-bar">
        {TAB_ITEMS.map(({ key, label, icon }) => (
          <button key={key} className={`admin-tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="admin-content">
        {loading ? <Spinner /> : (
          <>
            {/* Tab 1: Complaints */}
            {tab === 'complaints' && (
              <>
                <div className="admin-filter-bar">
                  <input className="admin-search-input" placeholder="🔍 Search by ID code or complainant name..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  {['all', 'pending', 'approved', 'resolved'].map(f => (
                    <button key={f} className={filterPillClass(f)} onClick={() => setActiveFilter(f)}>
                      {f === 'all' ? '📋 All' : f === 'pending' ? '⏳ Pending' : f === 'approved' ? '✅ Approved' : '✓ Resolved'}
                    </button>
                  ))}
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Complainant</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.tracking_code}</strong></td>
                          <td style={{fontWeight:700}}>{c.complainant_name}</td>
                          <td>{c.category}</td>
                          <td><span className={`status-pill ${c.status || 'pending'}`}>{c.status || 'pending'}</span></td>
<td><button className="btn-review" style={{ background: '#0f172a' }} onClick={() => setSelected(c)}>Review File</button></td>
                        </tr>
                      ))}
                      {filteredComplaints.length === 0 && (
                        <tr><td colSpan="5" style={{textAlign:'center', padding:'2.5rem', color:'#9ca3af', fontFamily:'Arial', fontSize:'1.05rem'}}>No complaints match this filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Tab 2: Infraction Reports */}
            {tab === 'reports' && (
              reports.length === 0
                ? <EmptyState icon="🔍" text="All systems clear" sub="No outstanding violations recorded." />
                : reports.map(r => (
                  <div key={r.id} className="admin-item-card">
                    <div className="admin-item-title">Reported by {r.users?.full_name || 'Anonymous'}</div>
                    <div className="admin-item-sub">Reason: {r.reason}</div>
                    <div className="admin-item-date">Logged: {new Date(r.created_at).toLocaleDateString()}</div>
                    <button onClick={() => dismissReport(r.id)} className="btn-success">✓ Dismiss Infraction</button>
                  </div>
                ))
            )}

            {/* Tab 3: User Content */}
            {tab === 'posts' && (
              posts.length === 0 ? <EmptyState icon="📝" text="No active posts" /> : posts.map(p => (
                <div key={p.id} className="admin-item-card">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                    <div className="admin-item-title">Author: {p.users?.full_name}</div>
                    <span className="badge">{p.type}</span>
                  </div>
                  <div className="admin-item-sub">{p.content?.slice(0, 160)}{p.content?.length > 160 ? '…' : ''}</div>
                  <div className="admin-item-date">Posted: {new Date(p.created_at).toLocaleDateString()}</div>
                  <button onClick={() => deletePost(p.id)} className="btn-danger">🗑 Delete Post</button>
                </div>
              ))
            )}

            {/* Tab 4: Users */}
            {tab === 'users' && (
              users.length === 0 ? <EmptyState icon="👥" text="No ledger entries" /> : users.map(u => (
                <div key={u.id} className="admin-item-card" style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                  <div className="user-avatar">{(u.full_name || '?').slice(0, 2).toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div className="admin-item-title" style={{marginBottom:'0.25rem'}}>{u.full_name}</div>
                    <div style={{fontFamily:'Arial', fontSize:'0.9rem', color:'#6b7280', fontWeight:600}}>
                      Level: {u.volunteer_profiles?.level || 'Newbie'} · Points: {u.volunteer_profiles?.points || 0}
                    </div>
                  </div>
                  {u.volunteer_profiles?.verified
                    ? <button onClick={() => verifyUser(u.id, false)} className="btn-danger">Revoke</button>
                    : <button onClick={() => verifyUser(u.id, true)} className="btn-success">✓ Verify</button>
                  }
                </div>
              ))
            )}

            {/* Tab 5: SOS Help */}
            {tab === 'help' && (
              helpReqs.length === 0 ? <EmptyState icon="🆘" text="No active emergencies" /> : helpReqs.map(h => (
                <div key={h.id} className="admin-item-card">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                    <div className="admin-item-title">{h.title}</div>
                    <span className={`status-pill ${h.status}`}>{h.status}</span>
                  </div>
                  <div className="admin-item-sub">City: {h.city} · {h.required_volunteers} volunteers needed</div>
                  {h.status === 'open' && (
                    <button onClick={() => closeHelp(h.id)} className="btn-danger">Close Request</button>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      <ReviewModal complaint={selected} onClose={() => setSelected(null)} onApprove={handleApprove} onPurge={handlePurge} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
