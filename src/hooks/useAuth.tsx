import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { uploadAvatar, createInitialEmployeeProfile, Employee } from '@/services/supabaseService';

// Define the structure of user_metadata more explicitly if needed, especially for avatar_url
interface UserMetadata {
  name?: string;
  avatar_url?: string;
  // Add other metadata fields if you have them
}

interface AppUser extends User { // Extend Supabase User type
  user_metadata: UserMetadata;
}

interface AuthContextType {
  user: AppUser | null; // Use AppUser type
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, selfieFile: File) => Promise<void>;
  logout: () => Promise<void>;
  updateUserMetadata: (metadata: Partial<UserMetadata>) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null); // Use AppUser type
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        const currentUser = newSession?.user as AppUser ?? null;
        setUser(currentUser);
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Giriş Başarılı",
            description: `Hoş geldiniz ${currentUser?.user_metadata?.name || currentUser?.email || ''}!`,
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Çıkış Yapıldı",
            description: "Başarıyla çıkış yaptınız.",
          });
        } else if (event === 'USER_UPDATED') {
           setUser(currentUser);
           toast({
             title: "Profil Güncellendi",
             description: "Kullanıcı bilgileriniz güncellendi.",
             variant: "default" 
           });
        } else if (event === 'PASSWORD_RECOVERY') {
            toast({
                title: "Şifre Kurtarma Adımı",
                description: "E-postanıza gelen bağlantıyı kullanarak yeni şifrenizi ayarlayabilirsiniz.",
                variant: "default"
            });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user as AppUser ?? null); // Cast to AppUser
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız');
      toast({
        title: "Giriş Başarısız",
        description: err.message || 'Geçersiz kullanıcı adı veya şifre',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (email: string, password: string, name: string, selfieFile: File) => {
    setIsLoading(true);
    setError(null);
    let createdUser: User | null = null;

    try {
      // Step 1: Create the user in Supabase Auth with basic metadata (name)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { name } // Pass name here, avatar_url will be updated later
        }
      });
      
      if (signUpError) {
        throw signUpError;
      }
      if (!signUpData.user) {
        throw new Error("Kullanıcı oluşturuldu ancak kullanıcı verisi alınamadı.");
      }
      createdUser = signUpData.user; // Store created user

      // Step 2: Upload the selfie to Supabase Storage
      const avatarUrl = await uploadAvatar(createdUser.id, selfieFile);
      if (!avatarUrl) {
        // If avatar upload fails, you might want to clean up the created auth user
        // or allow signup without avatar, but the requirement is selfie is mandatory.
        // For now, we throw an error. A more robust solution might delete the auth user.
        console.error('Selfie yüklenemedi, Supabase Auth kullanıcısı silinebilir veya başka bir işlem yapılabilir.');
        throw new Error('Selfie yüklenemedi. Kayıt tamamlanamadı.');
      }

      // Log the avatarUrl before attempting to update user metadata
      console.log("[useAuth - signup] Attempting to update user metadata. User ID:", createdUser.id, "Avatar URL:", avatarUrl);

      // Step 2.5: Refresh session to ensure it's fully active before updateUser
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError) {
        console.error("[useAuth - signup] Error refreshing session before metadata update:", sessionError);
        // Potentially throw an error here if a valid session is strictly needed for updateUser to succeed
        // For now, we'll log and proceed, but this could be a point of failure.
      } else {
        console.log("[useAuth - signup] Session refreshed, new session:", sessionData.session);
        // Update local state if necessary, though onAuthStateChange should also handle it
        if (sessionData.session) setSession(sessionData.session);
        if (sessionData.user) setUser(sessionData.user as AppUser);
      }

      // Step 3: Update the auth user's metadata with the new avatar_url
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });

      if (updateUserError) {
        // Similar to above, handle potential cleanup or inconsistent state
        console.error('Auth kullanıcısı metadata güncellenemedi, Supabase Auth kullanıcısı silinebilir.');
        throw updateUserError;
      }

      // Step 4: Create the employee profile in the 'employees' table
      const employeeProfile = await createInitialEmployeeProfile(
        createdUser.id, 
        name, 
        email, 
        avatarUrl
      );

      if (!employeeProfile) {
        // Critical failure: user is in auth, but not in employees table.
        // This state should ideally be handled, e.g., by trying to delete the auth user.
        console.error('Çalışan profili oluşturulamadı. Auth kullanıcısı:', createdUser.id);
        throw new Error('Çalışan profili oluşturulamadı. Kayıt tamamlanamadı.');
      }
      
      // Update local user state immediately after all operations succeed
      // The onAuthStateChange listener will also pick this up, but setUser here can be quicker for UI.
      setUser(createdUser as AppUser); // Ensure createdUser is cast correctly or refreshed

      toast({
        title: "Kayıt Başarılı",
        description: "Hesabınız başarıyla oluşturuldu ve selfie yüklendi.",
      });

    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız');
      toast({
        title: "Kayıt Başarısız",
        description: err.message || 'Kayıt işlemi sırasında bir hata oluştu',
        variant: "destructive",
      });
      // If signup failed at any step after user creation, consider cleaning up the auth user
      // This is complex and depends on the desired transactional behavior.
      // For example, if (createdUser) { /* await supabase.auth.admin.deleteUser(createdUser.id) */ }
      // This requires admin privileges for the client, which is not typical.
      // Or guide user to contact support.
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const updateUserMetadata = async (metadata: Partial<UserMetadata>) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: metadata,
      });

      if (updateError) {
        throw updateError;
      }

      // The onAuthStateChange listener should pick up the USER_UPDATED event
      // and update the user state automatically.
      // However, we can also set it directly if needed, but it might cause an extra render.
      // setUser(data.user as AppUser); // Or let onAuthStateChange handle it

      toast({
        title: "Profil Güncellendi",
        description: "Kullanıcı bilgileriniz başarıyla güncellendi.",
      });
    } catch (err: any) {
      console.error('Failed to update user metadata:', err);
      setError(err.message || 'Kullanıcı bilgileri güncellenemedi.');
      toast({
        title: "Güncelleme Başarısız",
        description: err.message || 'Kullanıcı bilgileri güncellenirken bir hata oluştu.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // redirectTo: specify your password reset page URL if different from default
        // Example: redirectTo: `${window.location.origin}/update-password` 
        // Ensure this URL is whitelisted in your Supabase project's auth settings.
      });
      if (resetError) {
        throw resetError;
      }
      toast({
        title: "Şifre Sıfırlama Talebi Gönderildi",
        description: "Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderilecektir.",
        variant: "default",
        duration: 7000,
      });
      return true;
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setError(err.message || 'Şifre sıfırlama talebi başarısız.');
      toast({
        title: "Talep Başarısız",
        description: err.message || 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu. Lütfen e-posta adresinizi kontrol edin ve tekrar deneyin.',
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        error,
        login,
        signup,
        logout,
        updateUserMetadata,
        requestPasswordReset,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
