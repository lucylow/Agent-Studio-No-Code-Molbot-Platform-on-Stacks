import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const DEMO_USER: User = {
  id: "demo-user-00000000-0000-0000-0000-000000000000",
  email: "demo@molbot.xyz",
  app_metadata: {},
  user_metadata: { display_name: "Demo User" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

const DEMO_SESSION: Session = {
  access_token: "demo-token",
  refresh_token: "demo-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: DEMO_USER,
} as Session;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isDemo) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isDemo) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  const enterDemoMode = () => {
    setIsDemo(true);
    setUser(DEMO_USER);
    setSession(DEMO_SESSION);
    setLoading(false);
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if (isDemo) {
      setIsDemo(false);
      setUser(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemo, signUp, signIn, signOut, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
