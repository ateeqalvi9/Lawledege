import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/hooks'; 
import { supabase } from '../api/supabaseClient'; 
import { Avatar, Spinner, EmptyState } from '../Components/SocialUI';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Relative time tracker
  const [timeSnapshot, setTimeSnapshot] = useState(null);

  // Retrieve list of recent conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data: sent } = await supabase.from('messages').select('sender_id, receiver_id, message, created_at').eq('sender_id', user.id).order('created_at', { ascending: false });
      const { data: received } = await supabase.from('messages').select('sender_id, receiver_id, message, created_at').eq('receiver_id', user.id).order('created_at', { ascending: false });

      const partnerIds = new Set();
      const convMap = {};
      [...(sent || []), ...(received || [])].forEach(m => {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!partnerIds.has(partnerId)) {
          partnerIds.add(partnerId);
          convMap[partnerId] = m;
        }
      });

      if (partnerIds.size === 0) { 
        setConversations([]); 
        setLoading(false); 
        return; 
      }

      const { data: users } = await supabase.from('users').select('id, full_name').in('id', Array.from(partnerIds));
      const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

      setConversations(Array.from(partnerIds).map(id => ({
        id, 
        name: userMap[id]?.full_name || 'Volunteer', 
        lastMsg: convMap[id]?.message, 
        lastTime: convMap[id]?.created_at
      })));
    } catch (err) {
      console.error('Failed to resolve conversation logs:', err);
    }
    setLoading(false);
  }, [user]);

  // Fetch actual message history for a specific person
  const fetchMessages = useCallback(async (partnerId) => {
    if (!user || !partnerId) return;
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }, [user]);
  // Open a specific chat

  const handleSelectConversation = async (conv) => {
    setActiveConv(conv);
    if (conv) {
      await fetchMessages(conv.id);
    }
  };

  // Component init logic
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    
    let isMounted = true;
    const initializeChatHistory = async () => {
      if (isMounted) {
        setTimeSnapshot(Date.now());
        
        await fetchConversations();
        
        if (location.state?.partnerId) {
          const targetedPartner = { 
            id: location.state.partnerId, 
            name: location.state.partnerName || 'Volunteer' 
          };
          setActiveConv(targetedPartner);
          await fetchMessages(targetedPartner.id);
          window.history.replaceState({}, document.title);
        }
      }
    };

    initializeChatHistory();
    return () => { isMounted = false; };
  }, [user, location.state, fetchConversations, fetchMessages, navigate]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for new incoming messages in real-time
  useEffect(() => {
    if (!user) return;
    const sub = supabase.channel('messages').on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `receiver_id=eq.${user.id}`,
    }, payload => {
      if (activeConv && (payload.new.sender_id === activeConv.id || payload.new.receiver_id === activeConv.id)) {
        setMessages(prev => [...prev, payload.new]);
      }
      setTimeSnapshot(Date.now());
      fetchConversations();
    }).subscribe();
    
    return () => { supabase.removeChannel(sub); };
  }, [user, activeConv, fetchConversations]);
  // Message submission logic

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv) return;
    setSending(true);
    const { data } = await supabase.from('messages').insert({
      sender_id: user.id, receiver_id: activeConv.id, message: newMsg.trim()
    }).select().single();
    if (data) setMessages(prev => [...prev, data]);
    setNewMsg('');
    setSending(false);
    setTimeSnapshot(Date.now());
    fetchConversations();
  };

  // UI Formatting for message timestamps
  const formatTimeDisplay = (ts, currentSnapshotTime) => {
    if (!ts) return '';
    const baseClock = currentSnapshotTime || new Date().getTime();
    const d = new Date(ts);
    const diff = baseClock - d.getTime(); 
    if (diff < 3600000) return `${Math.max(0, Math.floor(diff / 60000))}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  if (!user) return null;

  // View 1: Active Chat Conversation
  if (activeConv) {
    const initials = activeConv.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {/* Message Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'relative' }}>
          <div style={{ height: 3, position: 'absolute', top: 0, left: 0, right: 0, background: 'linear-gradient(90deg,#ff0080,#7b2ff7)' }} />
          <button onClick={() => setActiveConv(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
          <Avatar initials={initials} size={38} ring />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{activeConv.name}</div>
            <div style={{ fontSize: 11, color: 'var(--green)' }}>Online</div>
          </div>
        </div>

        {/* Message Bubble List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {messages.map((m, i) => {
            const isMine = m.sender_id === user.id;
            return (
              <div key={m.id || i} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMine ? 'linear-gradient(135deg,#7b2ff7,#ff0080)' : '#fff',
                  color: isMine ? '#fff' : 'var(--text)',
                  fontSize: 14, lineHeight: 1.5,
                  border: isMine ? 'none' : '1.5px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                }}>
                  <p style={{ margin: 0, textAlign: 'left' }}>{m.message}</p>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                    {formatTimeDisplay(m.created_at, timeSnapshot)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '12px 12px 28px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 20, padding: '10px 16px', fontSize: 14, background: 'var(--bg)' }}
          />
          <button onClick={sendMessage} disabled={sending || !newMsg.trim()} style={{ background: 'linear-gradient(135deg,#7b2ff7,#ff0080)', color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 18, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ›
          </button>
        </div>
      </div>
    );
  }

  // View 2: Inbox Overview (Conversation List)
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#ff0080,#ff8c00,#ffd700,#00c851,#00bcd4,#7b2ff7)' }} />
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>Messages</h2>
        </div>
      </div>

      <div className="bottom-safe" style={{ padding: 12 }}>
        {loading ? <Spinner /> : conversations.length === 0 ? (
          <EmptyState icon="💬" text="No messages yet" sub="Connect with volunteers and start a conversation" />
        ) : conversations.map(conv => {
          const initials = conv.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={conv.id} onClick={() => handleSelectConversation(conv)} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1.5px solid var(--border)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
              <Avatar initials={initials} size={48} ring />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{conv.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lastMsg}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                {conv.lastTime ? formatTimeDisplay(conv.lastTime, timeSnapshot) : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}