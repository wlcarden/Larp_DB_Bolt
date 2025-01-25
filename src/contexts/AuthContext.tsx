import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DisplayNamePrompt } from '../components/DisplayNamePrompt';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  needsDisplayName: boolean;
  currentGameId: string | null;
  setCurrentGameId: (gameId: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsDisplayName, setNeedsDisplayName] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if user needs to set display name when accessing a game
  useEffect(() => {
    if (!user || !currentGameId) {
      setNeedsDisplayName(false);
      return;
    }

    async function checkDisplayName() {
      const { data: gameUsers, error } = await supabase
        .from('game_users')
        .select('id')
        .eq('game_id', currentGameId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking display name:', error);
        return;
      }

      setNeedsDisplayName(gameUsers.length === 0);
    }

    checkDisplayName();
  }, [user, currentGameId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut,
      needsDisplayName,
      currentGameId,
      setCurrentGameId
    }}>
      {children}
      {needsDisplayName && currentGameId && (
        <DisplayNamePrompt 
          gameId={currentGameId}
          onComplete={() => setNeedsDisplayName(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}