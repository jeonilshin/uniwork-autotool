import { supabase, getUserProfile, createUserProfile, UserRole } from './supabase';

export async function signIn(email: string, password: string, rememberMe: boolean = false) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  
  // Store remember me preference
  if (rememberMe) {
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('rememberMeExpiry', String(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days
  } else {
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('rememberMeExpiry');
  }
  
  // Check if user has a profile, if not create one as admin (first user)
  if (data.user) {
    const profile = await getUserProfile(data.user.id);
    if (!profile) {
      // First time login - create as admin
      await createUserProfile({
        id: data.user.id,
        email: data.user.email || email,
        role: 'admin',
        created_by: null,
      });
    }
  }
  
  return data;
}

export async function signOut() {
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('rememberMeExpiry');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const profile = await getUserProfile(userId);
  
  // If no profile exists, this user should be admin (first user scenario)
  if (!profile) {
    const user = await getUser();
    if (user) {
      try {
        await createUserProfile({
          id: user.id,
          email: user.email || '',
          role: 'admin',
          created_by: null,
        });
        return 'admin';
      } catch {
        // Profile might already exist, try fetching again
        const retryProfile = await getUserProfile(userId);
        return retryProfile?.role || 'admin';
      }
    }
    return 'admin'; // Default to admin if no profile
  }
  
  return profile.role;
}
