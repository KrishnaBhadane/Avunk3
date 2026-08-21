import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserRole, UserProfile, StudentProfile, TPProfile, CompanyProfile } from '../types';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  studentProfile: StudentProfile | null;
  tpProfile: TPProfile | null;
  companyProfile: CompanyProfile | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, role: UserRole, data: Record<string, any>) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateStudentProfile: (data: Partial<StudentProfile>) => Promise<{ success: boolean; error?: string }>;
  updateTPProfile: (data: Partial<TPProfile>) => Promise<{ success: boolean; error?: string }>;
  updateCompanyProfile: (data: Partial<CompanyProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [tpProfile, setTpProfile] = useState<TPProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch profile data from Supabase based on authenticated user
  const fetchProfile = useCallback(async (authUserId: string) => {
    try {
      // 1. Fetch the profile row
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (profileError) {
        console.warn('Error querying profile:', profileError.message);
      }

      let profile: UserProfile | null = profileData as UserProfile | null;

      // Self-heal: If profile row is missing but user is authenticated, create it from auth metadata
      if (!profile) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && currentUser.id === authUserId) {
          const meta = currentUser.user_metadata || {};
          const role: UserRole = meta.role || 'student';
          const email = currentUser.email || '';

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              auth_user_id: authUserId,
              role,
              email,
            }, { onConflict: 'auth_user_id' })
            .select()
            .maybeSingle();

          if (createError) {
            console.error('Failed to create profile row for auth user:', createError);
            setUser(null);
            setStudentProfile(null);
            setTpProfile(null);
            setCompanyProfile(null);
            return;
          }

          profile = newProfile as UserProfile;
        } else {
          setUser(null);
          setStudentProfile(null);
          setTpProfile(null);
          setCompanyProfile(null);
          return;
        }
      }

      if (!profile) {
        setUser(null);
        setStudentProfile(null);
        setTpProfile(null);
        setCompanyProfile(null);
        return;
      }

      setUser(profile);

      // 2. Fetch or create role-specific profile
      if (profile.role === 'student') {
        const { data: sp } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (sp) {
          setStudentProfile(sp as StudentProfile);
        } else {
          // Create default student profile if missing
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const meta = currentUser?.user_metadata || {};
          const { data: newSp } = await supabase
            .from('student_profiles')
            .upsert({
              profile_id: profile.id,
              full_name: meta.fullName || profile.email.split('@')[0],
              institute_name: meta.institute || '',
              department: meta.department || '',
              graduation_year: Number(meta.graduationYear) || new Date().getFullYear() + 1,
              phone: meta.phone || '',
              skills: meta.skills || [],
              discoverable: true,
              verification_status: 'pending',
            }, { onConflict: 'profile_id' })
            .select()
            .maybeSingle();

          setStudentProfile(newSp as StudentProfile | null);
          await supabase.rpc('initialize_credits', { p_user_profile_id: profile.id });
        }
        setTpProfile(null);
        setCompanyProfile(null);
      } else if (profile.role === 'tp') {
        const { data: tp } = await supabase
          .from('tp_profiles')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (tp) {
          setTpProfile(tp as TPProfile);
        } else {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const meta = currentUser?.user_metadata || {};
          const { data: newTp } = await supabase
            .from('tp_profiles')
            .upsert({
              profile_id: profile.id,
              institution_name: meta.institutionName || 'Training & Placement Cell',
              institution_email: profile.email,
              address: meta.address || '',
              verification_status: 'pending',
            }, { onConflict: 'profile_id' })
            .select()
            .maybeSingle();

          setTpProfile(newTp as TPProfile | null);
          await supabase.rpc('initialize_credits', { p_user_profile_id: profile.id });
        }
        setStudentProfile(null);
        setCompanyProfile(null);
      } else if (profile.role === 'company') {
        const { data: cp } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (cp) {
          setCompanyProfile(cp as CompanyProfile);
        } else {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const meta = currentUser?.user_metadata || {};
          const { data: newCp } = await supabase
            .from('company_profiles')
            .upsert({
              profile_id: profile.id,
              company_name: meta.companyName || profile.email.split('@')[0],
              company_email: profile.email,
              industry: meta.industry || '',
              website: meta.website || '',
              address: meta.address || '',
              verification_status: 'pending',
            }, { onConflict: 'profile_id' })
            .select()
            .maybeSingle();

          setCompanyProfile(newCp as CompanyProfile | null);
          await supabase.rpc('initialize_credits', { p_user_profile_id: profile.id });
        }
        setStudentProfile(null);
        setTpProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  // Listen for auth state changes
  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setUser(null);
          setStudentProfile(null);
          setTpProfile(null);
          setCompanyProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Login with real Supabase Auth
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }

    // Profile will be fetched automatically via onAuthStateChange
    setLoading(false);
    return { success: true };
  };

  // Signup with real Supabase Auth + metadata forwarding
  const signup = async (
    email: string,
    password: string,
    role: UserRole,
    data: Record<string, any>
  ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> => {
    setLoading(true);
    setAuthError(null);

    // 1. Create auth user with all registration metadata in user_metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          ...data,
        },
      },
    });

    if (authError || !authData.user) {
      const msg = authError?.message || 'Signup failed';
      setAuthError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }

    const authUserId = authData.user.id;
    const hasSession = !!authData.session;

    // If an active session was returned (email confirmation disabled or auto-confirmed)
    if (hasSession) {
      await fetchProfile(authUserId);
      setLoading(false);
      return { success: true, requiresEmailConfirmation: false };
    }

    // If email confirmation is enabled in Supabase, session is null until verified.
    // The database trigger will have created the profile rows in Postgres automatically.
    setLoading(false);
    return { success: true, requiresEmailConfirmation: true };
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setStudentProfile(null);
    setTpProfile(null);
    setCompanyProfile(null);
  };

  // Update student profile in DB
  const updateStudentProfile = async (data: Partial<StudentProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!studentProfile) return { success: false, error: 'No student profile found' };
    const { error } = await supabase
      .from('student_profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', studentProfile.id);
    if (error) {
      console.error('Failed to update student profile:', error);
      return { success: false, error: error.message };
    }
    setStudentProfile((prev) => (prev ? { ...prev, ...data, updated_at: new Date().toISOString() } : null));
    return { success: true };
  };

  // Update T&P profile in DB
  const updateTPProfile = async (data: Partial<TPProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!tpProfile) return { success: false, error: 'No T&P profile found' };
    const { error } = await supabase
      .from('tp_profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', tpProfile.id);
    if (error) {
      console.error('Failed to update T&P profile:', error);
      return { success: false, error: error.message };
    }
    setTpProfile((prev) => (prev ? { ...prev, ...data, updated_at: new Date().toISOString() } : null));
    return { success: true };
  };

  // Update company profile in DB
  const updateCompanyProfile = async (data: Partial<CompanyProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!companyProfile) return { success: false, error: 'No company profile found' };
    const { error } = await supabase
      .from('company_profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', companyProfile.id);
    if (error) {
      console.error('Failed to update company profile:', error);
      return { success: false, error: error.message };
    }
    setCompanyProfile((prev) => (prev ? { ...prev, ...data, updated_at: new Date().toISOString() } : null));
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        studentProfile,
        tpProfile,
        companyProfile,
        loading,
        authError,
        login,
        signup,
        logout,
        refreshProfile,
        updateStudentProfile,
        updateTPProfile,
        updateCompanyProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
