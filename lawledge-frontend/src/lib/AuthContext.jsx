import { useEffect, useState, useContext } from 'react';
import { supabase } from '../api/supabaseClient';
import { AuthContext } from './contextInstances.js'; 

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId, meta = {}) => {
    try {
      await supabase.from('users').upsert({ 
        id: userId,
        full_name: meta.full_name || 'User',
        phone: meta.phone || null,
        cnic: meta.cnic || null,
        is_volunteer: meta.role === 'volunteer'
      }, { onConflict: 'id', ignoreDuplicates: true });

      if (meta.role === 'volunteer') {
        const { data: vpExists } = await supabase.from('volunteer_profiles').select('id').eq('user_id', userId).maybeSingle();
        if (!vpExists) {
          await supabase.from('volunteer_profiles').insert({
            user_id: userId, bio: meta.bio || null, skills: meta.skills || null, location: meta.city || null,
            level: 'Newbie', availability: 'Available', points: 0, impact_score: 0, hours: 0, show_contact: true
          });
        }
      }

      const [{ data: vp }, { data: u }] = await Promise.all([
        supabase.from('volunteer_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      ]);
      setProfile({ ...(vp || {}), ...(u || {}), id: userId });
    } catch(e) {
      console.error('fetchProfile error:', e);
      setProfile({ id: userId });
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.user_metadata);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.user_metadata);
      else { setProfile(null); setLoading(false); }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = () => user && fetchProfile(user.id, user.user_metadata);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to satisfy the volunteer module component tracking imports
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};