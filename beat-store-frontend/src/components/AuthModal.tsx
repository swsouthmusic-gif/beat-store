// src/components/AuthModal.tsx
import * as React from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import FacebookIcon from '@mui/icons-material/Facebook';

type AuthMode = 'login' | 'signup' | 'forgot';

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;

  // Hook these to your real logic (Zustand/RTK Query/etc.)
  onLogin?: (payload: { username: string; password: string }) => Promise<void> | void;
  onSignUp?: (payload: {
    email: string;
    username: string;
    password: string;
  }) => Promise<void> | void;
  onSocialLogin?: (provider: 'google' | 'apple' | 'facebook') => Promise<void> | void;

  onForgotPassword?: (payload: { email: string }) => Promise<void> | void;

  initialMode?: AuthMode;
}

const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  onLogin,
  onSignUp,
  onSocialLogin,
  initialMode = 'login',
}) => {
  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Forms
  const [loginForm, setLoginForm] = React.useState({ username: '', password: '' });
  const [signUpForm, setSignUpForm] = React.useState({ email: '', username: '', password: '' });

  React.useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setLoading(false);
  }, [open, initialMode]);

  const resetErrors = () => setError(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Handlers
  const handleSubmitLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    resetErrors();

    if (!loginForm.username || !loginForm.password) {
      setError('Please enter your username and password.');
      return;
    }

    try {
      setLoading(true);
      await (onLogin?.(loginForm) ?? Promise.resolve());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    resetErrors();

    const { email, username, password } = signUpForm;
    if (!validateEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    try {
      setLoading(true);
      await (onSignUp?.({ email: email.trim(), username: username.trim(), password }) ??
        Promise.resolve());
      setMode('login');
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      setLoading(true);
      await (onSocialLogin?.(provider) ?? Promise.resolve());
      onClose();
    } catch (err: any) {
      setError(err?.message || `${provider} login failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // ======== Modern Minimal Design ========
  const modalSx = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90vw', sm: 400 },
    maxHeight: '90vh',
    overflow: 'auto',
    bgcolor: 'rgba(15, 15, 15, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
    p: 4,
  };

  const titleSx = {
    color: '#fff',
    fontWeight: 600,
    fontSize: '1.5rem',
    mb: 0.5,
    textAlign: 'center' as const,
  };

  const subtitleSx = {
    color: 'rgba(255, 255, 255, 0.6)',
    mb: 3,
    textAlign: 'center' as const,
    fontSize: '0.875rem',
  };

  const socialButtonSx = {
    width: '100%',
    py: 1.5,
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 500,
    fontSize: '0.875rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    bgcolor: 'rgba(255, 255, 255, 0.04)',
    color: '#fff',
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:disabled': {
      bgcolor: 'rgba(255, 255, 255, 0.02)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      transition: 'all 0.2s ease',
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
        fontSize: '0.875rem',
        py: 1.5,
        px: 2,
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '0.875rem',
    },
  };

  const primaryButtonSx = {
    width: '100%',
    py: 1.5,
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.875rem',
    bgcolor: '#fff',
    color: '#000',
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.9)',
    },
    '&:disabled': {
      bgcolor: 'rgba(255, 255, 255, 0.3)',
      color: 'rgba(0, 0, 0, 0.5)',
    },
  };

  const linkButtonSx = {
    textTransform: 'none' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.875rem',
    p: 0,
    minWidth: 0,
    '&:hover': {
      color: '#fff',
      bgcolor: 'transparent',
    },
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-description"
      slotProps={{
        backdrop: {
          style: {
            background: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(2px) saturate(160%)',
          },
        },
      }}
    >
      <Box sx={modalSx}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography id="auth-modal-title" variant="h4" sx={titleSx}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </Typography>
          <Typography id="auth-modal-description" variant="body2" sx={subtitleSx}>
            {mode === 'login' ? 'Sign in to your account to continue' : 'Join us to get started'}
          </Typography>
        </Box>

        {/* Error */}
        {error && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: '8px',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              textAlign: 'center' as const,
            }}
          >
            {error}
          </Box>
        )}

        {/* Social Login Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            sx={socialButtonSx}
          >
            Continue with Google
          </Button>

          <Button
            variant="outlined"
            startIcon={<AppleIcon />}
            onClick={() => handleSocialLogin('apple')}
            disabled={loading}
            sx={socialButtonSx}
          >
            Continue with Apple
          </Button>

          <Button
            variant="outlined"
            startIcon={<FacebookIcon />}
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading}
            sx={socialButtonSx}
          >
            Continue with Facebook
          </Button>
        </Box>

        {/* Divider */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Divider sx={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
          <Typography sx={{ px: 2, color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
            or
          </Typography>
          <Divider sx={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        </Box>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <Box
            component="form"
            onSubmit={handleSubmitLogin}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Username or Email"
              type="text"
              value={loginForm.username}
              onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
              required
              autoComplete="username"
              sx={fieldSx}
            />
            <TextField
              label="Password"
              type="password"
              value={loginForm.password}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
              sx={fieldSx}
            />

            <Button type="submit" variant="contained" disabled={loading} sx={primaryButtonSx}>
              {loading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                sx={linkButtonSx}
                onClick={() => {
                  resetErrors();
                  setMode('signup');
                }}
              >
                Don't have an account? Sign up
              </Button>
            </Box>
          </Box>
        )}

        {/* SIGN UP FORM */}
        {mode === 'signup' && (
          <Box
            component="form"
            onSubmit={handleSubmitSignUp}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Email"
              type="email"
              value={signUpForm.email}
              onChange={e => setSignUpForm(f => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
              sx={fieldSx}
            />
            <TextField
              label="Username"
              type="text"
              value={signUpForm.username}
              onChange={e => setSignUpForm(f => ({ ...f, username: e.target.value }))}
              required
              autoComplete="username"
              sx={fieldSx}
            />
            <TextField
              label="Password"
              type="password"
              value={signUpForm.password}
              onChange={e => setSignUpForm(f => ({ ...f, password: e.target.value }))}
              required
              autoComplete="new-password"
              sx={fieldSx}
            />

            <Button type="submit" variant="contained" disabled={loading} sx={primaryButtonSx}>
              {loading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                sx={linkButtonSx}
                onClick={() => {
                  resetErrors();
                  setMode('login');
                }}
              >
                Already have an account? Sign in
              </Button>
            </Box>
          </Box>
        )}

        {/* Close Button */}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'rgba(255, 255, 255, 0.6)',
            '&:hover': { color: '#fff' },
          }}
          disabled={loading}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Modal>
  );
};

export default AuthModal;
