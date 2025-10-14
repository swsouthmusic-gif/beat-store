import { useState, useRef, useEffect } from 'react';

import {
  Box,
  Typography,
  Button,
  IconButton,
  Modal,
  TextField,
  Avatar,
  Divider,
  useColorScheme,
} from '@mui/material';
import { Close, PhotoCamera, Save, Person } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

import '@/components/Style/beatdrawer.scss';

interface EditProfileProps {
  open: boolean;
  onClose: () => void;
}

interface UserProfile {
  username: string;
  email: string;
  bio: string;
  location: string;
  avatar: string | File | null;
}

const EditProfile = ({ open, onClose }: EditProfileProps) => {
  const { mode } = useColorScheme();
  const { show } = useToastStore();
  const { userProfile, updateProfile, loadProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    email: '',
    bio: '',
    location: '',
    avatar: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<UserProfile>>({});
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  // Load user data when modal opens
  useEffect(() => {
    if (open) {
      // Load profile if not already loaded
      if (!userProfile) {
        loadProfile();
      } else {
        console.log('Setting profile with userProfile:', userProfile);
        setProfile({
          username: userProfile.username || '',
          email: userProfile.email || '',
          bio: userProfile.bio || '',
          location: userProfile.location || '',
          avatar: userProfile.avatar || null,
        });
      }
    }
  }, [open, userProfile, loadProfile]);

  // Cleanup avatar preview URL when component unmounts or avatar changes
  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleInputChange =
    (field: keyof UserProfile) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setProfile(prev => ({
        ...prev,
        [field]: e.target.value,
      }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        show('Please select a valid image file', 'error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        show('Image size must be less than 5MB', 'error');
        return;
      }

      // Clean up previous preview URL
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }

      // Create new preview URL and store the file
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreviewUrl(previewUrl);
      setProfile(prev => ({
        ...prev,
        avatar: file,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserProfile> = {};

    if (!profile.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (profile.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (profile.bio && profile.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Convert UserProfile to AuthUserProfile format
      const profileData = {
        username: profile.username,
        email: profile.email,
        bio: profile.bio,
        location: profile.location,
        avatar: profile.avatar,
      };

      await updateProfile(profileData);
      show('Profile updated successfully!', 'success');
      // Reload profile to get updated data including avatar
      await loadProfile();
      onClose();
    } catch (error) {
      show('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (_e?: object, reason?: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick') return;
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="edit-profile-modal-title"
      aria-describedby="edit-profile-modal-description"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      slotProps={{
        backdrop: {
          style: {
            background: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(2px) saturate(160%)',
          },
        },
      }}
    >
      <Box className="beat-drawer">
        <Box
          className="drawer-content edit-profile-content"
          sx={{
            p: 2,
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(188, 188, 188, 0.2)',
              borderRadius: '12px',
              zIndex: 0,
            },
            '& > :not(.no-positioning)': {
              position: 'relative',
              zIndex: 1,
            },
          }}
        >
          <IconButton onClick={handleClose} className="close-icon-btn">
            <Close />
          </IconButton>

          {/* Header */}
          <Box className="edit-profile-header">
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Edit Profile
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Update your personal information and preferences
            </Typography>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Profile Content - Scrollable */}
          <Box className="profile-content">
            {/* Avatar Section */}
            <Box className="avatar-section">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 4,
                }}
              >
                <Avatar
                  src={
                    profile.avatar instanceof File
                      ? avatarPreviewUrl || undefined
                      : typeof profile.avatar === 'string' && profile.avatar
                        ? profile.avatar
                        : undefined
                  }
                  sx={{
                    width: 80,
                    height: 80,
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Person sx={{ fontSize: 40 }} />
                </Avatar>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<PhotoCamera />}
                    onClick={handleAvatarClick}
                    sx={{
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                        color: '#fff',
                      },
                    }}
                  >
                    Change Photo
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.6 }}>
                    JPG, PNG or GIF. Max size 5MB.
                  </Typography>
                </Box>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </Box>

            {/* Form Fields */}
            <Box className="profile-form">
              <TextField
                id="username"
                name="username"
                label="Username"
                value={profile.username}
                onChange={handleInputChange('username')}
                error={!!errors.username}
                helperText={errors.username}
                required
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      bgcolor: 'rgba(255, 255, 255, 0.06)',
                    },
                    '&.Mui-focused': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.1)',
                    },
                    input: {
                      color: '#fff',
                      py: 1.5,
                      px: 2,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              />

              <TextField
                id="email"
                name="email"
                label="Email"
                type="email"
                value={profile.email}
                onChange={handleInputChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                required
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      bgcolor: 'rgba(255, 255, 255, 0.06)',
                    },
                    '&.Mui-focused': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.1)',
                    },
                    input: {
                      color: '#fff',
                      py: 1.5,
                      px: 2,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              />

              <TextField
                id="location"
                name="location"
                label="Location"
                value={profile.location}
                onChange={handleInputChange('location')}
                fullWidth
                placeholder="City, Country"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      bgcolor: 'rgba(255, 255, 255, 0.06)',
                    },
                    '&.Mui-focused': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.1)',
                    },
                    input: {
                      color: '#fff',
                      py: 1.5,
                      px: 2,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />

              <TextField
                label="Bio"
                id="bio"
                value={profile.bio}
                onChange={handleInputChange('bio')}
                error={!!errors.bio}
                helperText={errors.bio || `${profile.bio.length}/500 characters`}
                multiline
                rows={4}
                fullWidth
                placeholder="Tell us about yourself..."
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      bgcolor: 'rgba(255, 255, 255, 0.06)',
                    },
                    '&.Mui-focused': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.1)',
                    },
                    textarea: {
                      color: '#fff',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Actions - Fixed at bottom */}
          <Box className="actions-container">
            <Button
              variant="outlined"
              onClick={handleClose}
              className="cancel-btn"
              startIcon={<Close sx={{ fontSize: '20px' }} />}
            >
              Cancel
            </Button>
            <Button
              className="continue-btn"
              onClick={handleSave}
              disabled={isLoading}
              startIcon={<Save sx={{ fontSize: '20px' }} />}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default EditProfile;
