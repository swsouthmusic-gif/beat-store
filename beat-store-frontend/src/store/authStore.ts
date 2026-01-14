// /store/authStore.ts
import { create } from 'zustand';
import { userAPI } from '@/api/users';
import type { UpdateProfileData } from '@/api/users';

interface AuthUserProfile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_initial: string;
  bio: string;
  location: string;
  avatar: string | File | null;
}

interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  userProfile: AuthUserProfile | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  signup: (payload: { email: string; username: string; password: string }) => Promise<void>;
  updateProfile: (profile: Partial<AuthUserProfile>) => Promise<void>;
  loadProfile: () => Promise<void>;

  rehydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isLoggedIn: false,
  userProfile: null,

  rehydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
      set({ token, isLoggedIn: true });
      // Load profile, but it will handle token expiration gracefully
      get()
        .loadProfile()
        .catch(() => {
          // If profile loading fails, token will be cleared by loadProfile
        });
    }
  },

  loadProfile: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const profile = await userAPI.getProfile(token);

      // Transform backend profile to frontend format
      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:8000/api';
      const backendUrl = apiBaseUrl.replace('/api', ''); // Remove /api to get base backend URL
      const avatarUrl = profile.profile?.photo ? `${backendUrl}${profile.profile.photo}` : null;
      console.log('Profile photo URL:', profile.profile?.photo, 'Full URL:', avatarUrl);

      const authProfile: AuthUserProfile = {
        username: profile.username,
        email: profile.email,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        middle_initial: profile.profile?.middle_initial || '',
        bio: profile.profile?.bio || '',
        location: '', // Backend doesn't have location field yet
        avatar: avatarUrl,
      };

      set({ userProfile: authProfile });

      // Save to localStorage for offline access
      if (typeof window !== 'undefined') {
        localStorage.setItem('userProfile', JSON.stringify(authProfile));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);

      // If token is invalid (403/401), clear it and logout
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('token') ||
        errorMessage.includes('Token') ||
        errorMessage.includes('403') ||
        errorMessage.includes('401')
      ) {
        console.log('Token is invalid or expired, clearing authentication');
        get().logout();
        return;
      }

      // Fallback to localStorage if API fails for other reasons
      if (typeof window !== 'undefined') {
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
          try {
            const profile = JSON.parse(savedProfile);
            set({ userProfile: profile });
          } catch (parseError) {
            console.error('Failed to parse saved profile:', parseError);
          }
        }
      }
    }
  },

  login: async (username, password) => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/token/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      },
    );

    if (!response.ok) throw new Error('Invalid credentials');
    const data = await response.json();
    set({ token: data.access, isLoggedIn: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.access);
      await get().loadProfile();
    }
  },
  logout: () => {
    set({ token: null, isLoggedIn: false, userProfile: null });
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
  },

  updateProfile: async profileData => {
    const { token } = get();
    if (!token) throw new Error('No authentication token');

    try {
      // Transform frontend profile data to backend format
      const updateData: UpdateProfileData = {
        username: profileData.username,
        email: profileData.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        profile: {
          bio: profileData.bio,
          middle_initial: profileData.middle_initial || null,
          // Only include photo if it's a File (new upload), otherwise omit it (keep existing)
          ...(profileData.avatar instanceof File && { photo: profileData.avatar }),
        },
      };

      const updatedProfile = await userAPI.updateProfile(token, updateData);

      // Transform backend response to frontend format
      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:8000/api';
      const backendUrl = apiBaseUrl.replace('/api', ''); // Remove /api to get base backend URL
      const avatarUrl = updatedProfile.profile?.photo
        ? `${backendUrl}${updatedProfile.profile.photo}`
        : null;
      console.log(
        'Updated profile photo URL:',
        updatedProfile.profile?.photo,
        'Full URL:',
        avatarUrl,
      );

      const authProfile: AuthUserProfile = {
        username: updatedProfile.username,
        email: updatedProfile.email,
        first_name: updatedProfile.first_name || '',
        last_name: updatedProfile.last_name || '',
        middle_initial: updatedProfile.profile?.middle_initial || '',
        bio: updatedProfile.profile?.bio || '',
        location: '', // Backend doesn't have location field yet
        avatar: avatarUrl,
      };

      set({ userProfile: authProfile });

      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userProfile', JSON.stringify(authProfile));
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  },

  requestPasswordReset: async email => {
    // Adjust endpoint to your backend (Django example path)
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/password-reset/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      },
    );
    if (!response.ok) {
      const msg = await response.text().catch(() => null);
      throw new Error(msg || 'Failed to send reset email.');
    }
  },

  signup: async ({ email, username, password }) => {
    // Adjust endpoint to your backend (Django example path)
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/signup/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      },
    );

    if (!response.ok) {
      const msg = await response.text().catch(() => null);
      throw new Error(msg || 'Sign up failed.');
    }

    // Optional: auto-login after signup (uncomment if desired)
    // await get().login(username, password);
  },
}));
