import { supabase, getUserProfile, createUserProfile, UserRole } from './supabase';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  
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
  return profile?.role || 'secretary';
}
