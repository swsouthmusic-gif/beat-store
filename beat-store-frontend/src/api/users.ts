// /api/users.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: {
    photo: string | null;
    bio: string;
    created_at: string;
    updated_at: string;
  };
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile?: {
    photo?: File | string | null;
    bio?: string;
  };
}

class UserAPI {
  private getAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getProfile(token: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/users/profile/`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch profile');
    }

    return response.json();
  }

  async updateProfile(token: string, profileData: UpdateProfileData): Promise<UserProfile> {
    // Check if we have a file upload (photo)
    const hasFileUpload = profileData.profile?.photo instanceof File;

    if (hasFileUpload) {
      // Use FormData for file uploads
      const formData = new FormData();

      // Add user fields
      if (profileData.username) formData.append('username', profileData.username);
      if (profileData.email) formData.append('email', profileData.email);
      if (profileData.first_name) formData.append('first_name', profileData.first_name);
      if (profileData.last_name) formData.append('last_name', profileData.last_name);

      // Handle profile fields
      if (profileData.profile) {
        if (profileData.profile.bio !== undefined) {
          formData.append('profile.bio', profileData.profile.bio);
        }

        // Handle photo upload
        if (profileData.profile.photo instanceof File) {
          formData.append('profile.photo', profileData.profile.photo);
        }
      }

      const response = await fetch(`${API_BASE_URL}/users/profile/`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(token),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      return response.json();
    } else {
      // Use JSON for non-file updates
      const response = await fetch(`${API_BASE_URL}/users/profile/`, {
        method: 'PATCH',
        headers: {
          ...this.getAuthHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      return response.json();
    }
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/users/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Registration failed');
    }

    return response.json();
  }
}

export const userAPI = new UserAPI();
