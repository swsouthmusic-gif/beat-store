// /store/authStore.ts
import { create } from 'zustand';
import { userAPI } from '@/api/users';
import type { UpdateProfileData } from '@/api/users';

interface AuthUserProfile {
  username: string;
  email: string;
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
    if (token) {
      set({ token, isLoggedIn: true });
      get().loadProfile();
    }
  },

  loadProfile: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const profile = await userAPI.getProfile(token);

      // Transform backend profile to frontend format
      const avatarUrl = profile.profile?.photo
        ? `http://localhost:8000${profile.profile.photo}`
        : null;
      console.log('Profile photo URL:', profile.profile?.photo, 'Full URL:', avatarUrl);

      const authProfile: AuthUserProfile = {
        username: profile.username,
        email: profile.email,
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
      // Fallback to localStorage if API fails
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
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/token/`,
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
        profile: {
          bio: profileData.bio,
          photo: profileData.avatar instanceof File ? profileData.avatar : profileData.avatar,
        },
      };

      const updatedProfile = await userAPI.updateProfile(token, updateData);

      // Transform backend response to frontend format
      const avatarUrl = updatedProfile.profile?.photo
        ? `http://localhost:8000${updatedProfile.profile.photo}`
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
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/password-reset/`,
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
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/signup/`,
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
