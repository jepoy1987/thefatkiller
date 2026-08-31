import type { Session } from '@supabase/supabase-js';
import type { Profile, UserGoal } from '@tfk/types';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { supabase } from '../lib/supabase';

type AuthContextValue = { session: Session | null; profile: Profile | null; goal: UserGoal | null; loading: boolean; refreshProfile: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); setGoal(null); return; }
    const [{ data, error }, { data: activeGoal, error: goalError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_goals').select('*').eq('is_active', true).maybeSingle(),
    ]);
    if (error || goalError) throw error ?? goalError;
    setProfile(data as Profile); setGoal(activeGoal as UserGoal | null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await refreshProfile();
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setProfile(null); setGoal(null); }
      else void refreshProfile();
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, profile, goal, loading, refreshProfile }), [session, profile, goal, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
