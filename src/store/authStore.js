import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const useAuthStore = create((set) => ({
  session: null,
  user: null,
  loading: true,
  error: null,
  
  initialize: async () => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data?.session) {
        set({ 
          session: data.session,
          user: data.session.user
        });
      }
    } catch (error) {
      set({ error: error.message });
      console.error('Error initializing auth:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      set({ 
        session: data.session,
        user: data.session.user
      });
      
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },
  
  register: async (email, password, userData = {}) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name || '',
            student_code: userData.student_code || '',
            semester: userData.semester || '',
            user_type: 'student',
            is_admin: false
          }
        }
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      set({ session: null, user: null });
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },
  
  clearError: () => set({ error: null })
}));

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    useAuthStore.setState({ 
      session,
      user: session.user,
    });
  } else {
    useAuthStore.setState({ 
      session: null,
      user: null,
    });
  }
});

export default useAuthStore;
