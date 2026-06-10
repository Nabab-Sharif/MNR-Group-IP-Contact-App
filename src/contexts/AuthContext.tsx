import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveSession, loadSession, clearSession, findKnownCode, isOnline } from '@/lib/offlineDb';

interface AccessCode {
  id: string;
  code: string;
  label: string | null;
  role: 'admin' | 'user' | 'sub_admin';
  is_active: boolean;
  office_id?: string | null;
  department_id?: string | null;
  last_active?: string | null;
}

interface AuthContextType {
  accessCode: AccessCode | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSubAdmin: boolean;
  isLoggedIn: boolean;
  loading: boolean;
  login: (code: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

const STORAGE_KEY = 'phone_directory_access_code';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessCode, setAccessCode] = useState<AccessCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (!saved) {
          // Try IndexedDB session as fallback
          const offlineSession = await loadSession();
          if (offlineSession) {
            setAccessCode(offlineSession as AccessCode);
          }
          setLoading(false);
          return;
        }

        if (isOnline()) {
          // Online: verify with Supabase
          try {
            const { data, error } = await supabase
              .from('access_codes')
              .select('*')
              .eq('code', saved)
              .eq('is_active', true)
              .maybeSingle();

            if (error) throw error;

            if (data) {
              const ac = data as AccessCode;
              setAccessCode(ac);
              await saveSession(ac);
              // Update last_active in background
              supabase.from('access_codes').update({ last_active: new Date().toISOString() }).eq('id', ac.id).then(() => {});
            } else {
              // Code is no longer valid, clear session
              localStorage.removeItem(STORAGE_KEY);
              await clearSession();
              setAccessCode(null);
            }
          } catch (error) {
            console.error('Error verifying session with Supabase:', error);
            // Fall back to offline session if verification fails
            const offlineSession = await loadSession();
            if (offlineSession) {
              setAccessCode(offlineSession as AccessCode);
            }
          }
        } else {
          // Offline: load from IndexedDB
          const offlineSession = await loadSession();
          if (offlineSession) {
            setAccessCode(offlineSession as AccessCode);
          } else {
            // No offline session, but code exists in localStorage - keep it for when online
            console.log('Code saved but not loaded from IndexedDB. Will verify when online.');
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const login = async (code: string) => {
    try {
      if (isOnline()) {
        const { data, error } = await supabase
          .from('access_codes')
          .select('*')
          .eq('code', code.trim())
          .eq('is_active', true)
          .maybeSingle();

        if (error) return { error: error.message };
        if (!data) return { error: 'Invalid Access ID' };

        const ac = data as AccessCode;
        
        // Save to all storage layers
        setAccessCode(ac);
        localStorage.setItem(STORAGE_KEY, ac.code);
        await saveSession(ac);
        
        // Update last_active in background
        supabase.from('access_codes').update({ last_active: new Date().toISOString() }).eq('id', ac.id).then(() => {});
        
        return { error: null };
      } else {
        // Offline login: check IndexedDB for any previously cached code
        const cachedCode = await findKnownCode(code.trim());
        if (cachedCode) {
          setAccessCode(cachedCode as AccessCode);
          localStorage.setItem(STORAGE_KEY, cachedCode.code);
          await saveSession(cachedCode);
          return { error: null };
        }
        return { error: 'Offline - শুধুমাত্র আগে login করা ID দিয়ে login করা যাবে' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      setAccessCode(null);
      localStorage.removeItem(STORAGE_KEY);
      await clearSession();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        accessCode,
        isAdmin: accessCode?.role === 'admin' || (accessCode?.role as string) === 'sub_admin',
        isSuperAdmin: accessCode?.role === 'admin',
        isSubAdmin: (accessCode?.role as string) === 'sub_admin',
        isLoggedIn: !!accessCode,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
