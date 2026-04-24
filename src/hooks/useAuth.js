import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsRecovery(false);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return { error: null };
    const { error: deleteError } = await supabase.rpc('delete_own_account');
    if (deleteError) return { error: deleteError };
    await supabase.auth.signOut();
    return { error: null };
  }, []);

  return { user, loading, isRecovery, signInWithGoogle, signInWithPassword, signUp, resetPassword, updatePassword, signOut, deleteAccount, available: !!supabase };
}
