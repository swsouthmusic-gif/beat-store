// /store/authStore.ts
import { create } from 'zustand';
import { userAPI } from '@/api/users';
import type { UpdateProfileData } from '@/api/users';
import { usePlaybackStore } from './playBackStore';
import { useWaveformStore } from './waveformStore';

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
      // Photo URL is already a full URL from backend (S3 or local)
      const avatarUrl = profile.profile?.photo || null;

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
    
    // Clear all other stores and refresh the UI completely
    if (typeof window !== 'undefined') {
      // Clear playback store
      usePlaybackStore.getState().pause();
      usePlaybackStore.setState({
        currentBeatId: null,
        audioUrl: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        beats: [],
        isAudioPlayerVisible: true,
      });
      
      // Clear waveform store
      useWaveformStore.setState({
        instances: new Map(),
        currentBeatId: null,
        currentTime: 0,
        duration: 0,
      });
      
      // Reload the page to completely refresh the UI
      window.location.reload();
    }
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
      // Photo URL is already a full URL from backend (S3 or local)
      const avatarUrl = updatedProfile.profile?.photo || null;

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
      `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/users/register/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, password_confirm: password }),
      },
    );

    if (!response.ok) {
      try {
        const errorData = await response.json();
        // Django REST Framework returns errors in format: { "field": ["error message"] }
        // Check for username error first
        if (errorData.username && Array.isArray(errorData.username) && errorData.username.length > 0) {
          throw new Error(errorData.username[0]);
        }
        // Check for email error
        if (errorData.email && Array.isArray(errorData.email) && errorData.email.length > 0) {
          throw new Error(errorData.email[0]);
        }
        // Check for password error
        if (errorData.password && Array.isArray(errorData.password) && errorData.password.length > 0) {
          throw new Error(errorData.password[0]);
        }
        // Check for non-field errors
        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors) && errorData.non_field_errors.length > 0) {
          throw new Error(errorData.non_field_errors[0]);
        }
        // Fallback to first error found
        const firstError = Object.values(errorData)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
          throw new Error(firstError[0]);
        }
        throw new Error('Sign up failed. Please try again.');
      } catch (err) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error('Sign up failed. Please try again.');
      }
    }

    // Optional: auto-login after signup (uncomment if desired)
    // await get().login(username, password);
  },
}));
