import { useEffect, useState, useRef } from 'react';

import {
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  IconButton,
  useColorScheme,
  Modal,
  TextField,
} from '@mui/material';
import {
  Close,
  PlayArrowRounded,
  PauseRounded,
  ArrowForward,
  ArrowBackRounded,
  Facebook,
  Apple,
  Google,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

// @ts-ignore
import ColorThief from 'colorthief';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

import Waveform from '@/components/Waveform';
import LegalAgreementStep from '@/components/LegalAgreementStep';
import CheckoutStep from '@/components/CheckoutStep';
import DownloadLoading from '@/components/DownloadLoading';

import { genreColors } from '@/constants/genreColors';
import { iconTypeMap, levelColorMap, levelLabelMap } from '@/constants/licenseMaps';
import '@/components/Style/beatdrawer.scss';

interface BeatDrawerProps {
  open: boolean;
  onClose: () => void;
  beat: BeatType | null;
  selectedDownloadType: 'mp3' | 'wav' | 'stems' | null;
  setSelectedDownloadType: (type: 'mp3' | 'wav' | 'stems' | null) => void;
  onRequestAuth?: (mode: 'login' | 'forgot' | 'signup') => void;
}

const toRgba = (color: string, alpha: number) => {
  if (color.startsWith('#')) {
    // hex -> rgb
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(c => c + c)
        .join('');
    }
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // already rgb(...)
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
  }

  return color; // fallback
};

const rgbStringToRgba = (rgbStr: string, alpha: number) => {
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return rgbStr;
  const [r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const lightenColor = (rgbStr: string, factor = 0.2) => {
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return rgbStr;

  let [r, g, b] = match.map(Number);

  r = Math.min(255, Math.round(r + (255 - r) * factor));
  g = Math.min(255, Math.round(g + (255 - g) * factor));
  b = Math.min(255, Math.round(b + (255 - b) * factor));

  return `rgb(${r}, ${g}, ${b})`;
};

// const levelLabelDescription = {
//   mp3: 'Lightweight MP3 — perfect for quick drafts and casual listening.',
//   wav: 'Uncompressed WAV — crisp, clean sound for polished demos.',
//   stems: 'All the stems in WAV — full beat control to mix, remix, and own your sound.',
// };

const priceMap: Record<'mp3' | 'wav' | 'stems', keyof BeatType> = {
  mp3: 'mp3_price',
  wav: 'wav_price',
  stems: 'stems_price',
};

const downloadTypes = ['mp3', 'wav', 'stems'] as const;

const BeatDrawer = ({
  open,
  onClose,
  beat,
  selectedDownloadType,
  setSelectedDownloadType,
  onRequestAuth,
}: BeatDrawerProps) => {
  const { mode } = useColorScheme();

  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSelectionError, setShowSelectionError] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreementError, setShowAgreementError] = useState(false);

  const { show } = useToastStore();

  const imgRef = useRef<HTMLImageElement>(null);

  const { currentBeatId, isPlaying, play, pause, setBeat } = usePlaybackStore();
  const isCurrent = beat?.id === currentBeatId;

  // Authentication state
  const { login, isLoggedIn } = useAuthStore();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedLicense =
    selectedDownloadType && beat
      ? {
          type: selectedDownloadType,
          label: levelLabelMap[selectedDownloadType],
          color: levelColorMap[selectedDownloadType],
          includes: iconTypeMap[selectedDownloadType],
          price: beat[priceMap[selectedDownloadType]], // number | string
        }
      : null;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!beat) return;
    if (!isCurrent) {
      setBeat(beat.id, beat.snippet_mp3);
    } else {
      isPlaying ? pause() : play();
    }
  };

  useEffect(() => {
    if (!beat?.cover_art) {
      setDominantColor(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // set BEFORE src
    const url = beat.cover_art + (beat.cover_art.includes('?') ? '&cf=' : '?cf=') + Date.now();
    img.src = url;

    img.onload = () => {
      try {
        const ct = new ColorThief();
        const [r, g, b] = ct.getColor(img, 25);
        setDominantColor(`rgb(${r}, ${g}, ${b})`);
      } catch {
        setDominantColor(null);
      }
    };
    img.onerror = () => setDominantColor(null);
  }, [beat?.cover_art]);

  // Cleanup effect to prevent glitches
  useEffect(() => {
    if (!open) {
      // Reset all states when drawer closes
      setShowAgreement(false);
      setShowCheckout(false);
      setAgreed(false);
      setShowSelectionError(false);
      setShowAgreementError(false);
      setSelectedDownloadType(null);
      setDominantColor(null);
      setLoginForm({ username: '', password: '' });
      setLoginError(null);
      setIsLoggingIn(false);
    }
  }, [open, setSelectedDownloadType]);

  const handleClose = (_e?: object, reason?: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick') return;
    // Reset all states before closing
    setShowAgreement(false);
    setShowCheckout(false);
    setAgreed(false);
    setShowSelectionError(false);
    setShowAgreementError(false);
    setSelectedDownloadType(null);
    setDominantColor(null);
    setLoginForm({ username: '', password: '' });
    setLoginError(null);
    setIsLoggingIn(false);

    // Call the parent's onClose function
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const playButton = (
    <IconButton className="play-btn" onClick={handlePlayPause}>
      {isCurrent && isPlaying ? (
        <PauseRounded sx={{ fontSize: 32, color: '#FFF' }} />
      ) : (
        <PlayArrowRounded sx={{ fontSize: 32, color: '#FFF' }} />
      )}
    </IconButton>
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginForm.username, loginForm.password);
      show(`Welcome ${loginForm.username}`, 'success');
    } catch (err) {
      setLoginError('Invalid username or password');
    }
  };

  return (
    <>
      {/* Download Loading Overlay */}
      <DownloadLoading
        isVisible={isDownloading}
        downloadType={selectedDownloadType || 'mp3'}
        beatName={beat?.name || 'Beat'}
      />

      <Modal
        open={open && !!beat}
        onClose={handleClose}
        aria-labelledby="beat-drawer-modal-title"
        aria-describedby="beat-drawer-modal-description"
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
          {beat && (
            <Box
              className="drawer-content"
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
              {!showAgreement && !showCheckout ? (
                <>
                  <Box className="beat-drawer-header">
                    <img
                      ref={imgRef}
                      src={beat.cover_art}
                      alt={beat.name}
                      crossOrigin="anonymous"
                      className="beat-cover-art"
                    />
                    <Box className="info">
                      <Typography variant="h6" fontSize="20px" color="text.primary">
                        {beat.name}
                      </Typography>
                      <Box className="meta-info">
                        <Chip
                          label={beat.genre}
                          size="small"
                          className="genre-chep"
                          sx={{
                            backgroundColor: genreColors[beat.genre],
                          }}
                        />
                        <Typography variant="body2" color="text.primary" sx={{ opacity: '.8' }}>
                          {beat.bpm} BPM • {beat.scale}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box className="player">
                    <IconButton
                      className="play-btn"
                      onClick={handlePlayPause}
                      sx={{
                        backgroundColor: dominantColor,
                        '&:hover': {
                          backgroundColor: dominantColor
                            ? rgbStringToRgba(dominantColor, 0.2) // dark overlay from extracted color
                            : 'rgba(18, 18, 18, 0.2)', // fallback with alpha
                        },
                      }}
                    >
                      {isCurrent && isPlaying ? (
                        <PauseRounded
                          sx={{
                            fontSize: 32,
                            color: '#FFF',
                          }}
                        />
                      ) : (
                        <PlayArrowRounded
                          sx={{
                            fontSize: 32,
                            color: '#FFF',
                          }}
                        />
                      )}
                    </IconButton>
                    <Waveform
                      url={beat.snippet_mp3}
                      isCurrent={isCurrent}
                      height={40}
                      progressColor={'#ffffff'}
                      waveColor={'#8F8F8F'}
                    />
                  </Box>
                  <Box className="summary">
                    {/* License Package Chip */}
                    {selectedDownloadType && (
                      <Chip
                        label={levelLabelMap[selectedDownloadType]}
                        sx={{
                          backgroundColor: levelColorMap[selectedDownloadType] + '20',
                          color: levelColorMap[selectedDownloadType],
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          border: `1px solid ${levelColorMap[selectedDownloadType]}40`,
                        }}
                      />
                    )}

                    {/* Icon Types */}
                    <Box
                      className="icon-types"
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      {selectedDownloadType ? (
                        iconTypeMap[selectedDownloadType].map((iconType, index) => (
                          <Chip
                            key={index}
                            label={iconType.toUpperCase()}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          />
                        ))
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}
                        >
                          Choose a license
                        </Typography>
                      )}
                    </Box>

                    {/* Total Price */}
                    <Box className="total-price-container">
                      <Typography variant="body2" className="total-price-label">
                        Total:
                      </Typography>
                      <Typography
                        variant="h6"
                        className="total-price"
                        sx={{
                          color: selectedDownloadType
                            ? levelColorMap[selectedDownloadType]
                            : 'rgba(255, 255, 255, 0.5)',
                        }}
                      >
                        {selectedDownloadType ? `$${beat[priceMap[selectedDownloadType]]}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />

                  {/* LOGIN UI or Download Options */}
                  {!isLoggedIn ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <Typography
                        variant="h6"
                        gutterBottom
                        color="text.primary"
                        sx={{
                          fontWeight: 600,
                          fontSize: '1.25rem',
                          textAlign: 'left',
                          mb: 2,
                          width: '100%',
                        }}
                      >
                        Sign in to download
                      </Typography>

                      {/* Social Login Buttons */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          gap: 1.5,
                          width: '100%',
                          mb: 2,
                        }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={
                            <Box component="span" sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                              <Google />
                            </Box>
                          }
                          onClick={() => {
                            // Handle Google login - you can implement this
                            console.log('Google login clicked');
                          }}
                          disabled={isLoggingIn}
                          sx={{
                            width: '100%',
                            py: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            borderRadius: '12px',
                            textTransform: 'none' as const,
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            bgcolor: 'rgba(255, 255, 255, 0.04)',
                            color: 'rgba(255, 255, 255, .7)',
                            transition: 'all ease-in-out .2s',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'rgba(255, 255, 255, 1)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(255, 255, 255, 0.02)',
                              borderColor: 'rgba(255, 255, 255, 0.08)',
                            },
                            '& .MuiButton-startIcon': {
                              marginRight: 0,
                              marginLeft: 0,
                              marginBottom: '-8px',
                            },
                          }}
                        >
                          Google
                        </Button>

                        <Button
                          variant="outlined"
                          startIcon={
                            <Box component="span" sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                              <Apple />
                            </Box>
                          }
                          onClick={() => {
                            // Handle Apple login - you can implement this
                            console.log('Apple login clicked');
                          }}
                          disabled={isLoggingIn}
                          sx={{
                            width: '100%',
                            py: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            borderRadius: '12px',
                            textTransform: 'none' as const,
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            bgcolor: 'rgba(255, 255, 255, 0.04)',
                            color: 'rgba(255, 255, 255, .7)',
                            transition: 'all ease-in-out .2s',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'rgba(255, 255, 255, 1)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(255, 255, 255, 0.02)',
                              borderColor: 'rgba(255, 255, 255, 0.08)',
                            },
                            '& .MuiButton-startIcon': {
                              marginRight: 0,
                              marginLeft: 0,
                              marginBottom: '-8px',
                            },
                          }}
                        >
                          Apple
                        </Button>

                        <Button
                          variant="outlined"
                          startIcon={
                            <Box component="span" sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                              <Facebook />
                            </Box>
                          }
                          onClick={() => {
                            // Handle Facebook login - you can implement this
                            console.log('Facebook login clicked');
                          }}
                          disabled={isLoggingIn}
                          sx={{
                            width: '100%',
                            py: 1.2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            borderRadius: '12px',
                            textTransform: 'none' as const,
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            bgcolor: 'rgba(255, 255, 255, 0.04)',
                            color: 'rgba(255, 255, 255, .7)',
                            transition: 'all ease-in-out .2s',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'rgba(255, 255, 255, 1)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(255, 255, 255, 0.02)',
                              borderColor: 'rgba(255, 255, 255, 0.08)',
                            },
                            '& .MuiButton-startIcon': {
                              marginRight: 0,
                              marginLeft: 0,
                              marginBottom: '-8px',
                            },
                          }}
                        >
                          Facebook
                        </Button>
                      </Box>

                      {/* Divider */}
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                        <Divider sx={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
                        <Typography
                          sx={{ px: 2, color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}
                        >
                          or
                        </Typography>
                        <Divider sx={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
                      </Box>

                      <form
                        onSubmit={handleLogin}
                        style={{
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 16,
                          alignItems: 'center',
                        }}
                      >
                        <TextField
                          label="Username or Email"
                          type="text"
                          value={loginForm.username}
                          onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                          required
                          autoComplete="username"
                          sx={{
                            width: '100%',
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
                          }}
                        />
                        <TextField
                          label="Password"
                          type="password"
                          value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          required
                          autoComplete="current-password"
                          sx={{
                            width: '100%',
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
                          }}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={isLoggingIn}
                          sx={{
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
                          }}
                        >
                          {isLoggingIn ? 'Signing in...' : 'Sign In'}
                        </Button>

                        {loginError && (
                          <Box
                            sx={{
                              width: '100%',
                              p: 1.5,
                              borderRadius: '8px',
                              bgcolor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#fca5a5',
                              fontSize: '0.875rem',
                              textAlign: 'center' as const,
                            }}
                          >
                            {loginError}
                          </Box>
                        )}

                        <Box
                          className="login-actions"
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            gap: 1,
                            mb: 2,
                            width: '100%',
                          }}
                        >
                          <Button
                            variant="text"
                            size="small"
                            sx={{
                              textTransform: 'none',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              '&:hover': { color: '#fff' },
                            }}
                            onClick={() => {
                              handleClose();
                              onRequestAuth?.('forgot');
                            }}
                          >
                            Forgot Password?
                          </Button>

                          <Button
                            variant="text"
                            size="small"
                            sx={{
                              textTransform: 'none',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              '&:hover': { color: '#fff' },
                            }}
                            onClick={() => {
                              handleClose();
                              onRequestAuth?.('signup');
                            }}
                          >
                            Don't have an account? Sign Up
                          </Button>
                        </Box>
                      </form>
                    </Box>
                  ) : (
                    <>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        color="text.primary"
                        sx={{ paddingLeft: '20px', paddingBottom: '8px' }}
                      >
                        Licensing
                      </Typography>
                      <Box display="flex" className="levels-row">
                        {downloadTypes.map(type => {
                          const key = priceMap[type];
                          const price = beat?.[key] ?? 'N/A';
                          const levelColor = levelColorMap[type];
                          const isSelected = selectedDownloadType === type;

                          return (
                            <Box
                              key={type}
                              onClick={() => setSelectedDownloadType(type)}
                              className="level-box"
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: '1 1 0',
                                minWidth: 0,

                                cursor: 'pointer',
                                gap: '4px',
                                padding: '12px 12px 12px 12px',
                                borderRadius: '12px',
                                border: `1px solid ${levelColor}`,
                                boxShadow: isSelected ? `0 0 4px ${levelColor}` : 'none',
                                backgroundColor: isSelected
                                  ? levelColor
                                    ? toRgba(levelColor, 0.15)
                                    : 'rgba(18,18,18,0.1)'
                                  : 'transparent',
                                transition: 'all 0.2s ease-in-out',
                                ...(isSelected
                                  ? {}
                                  : {
                                      '&:hover': {
                                        backgroundColor: isSelected
                                          ? levelColor
                                            ? toRgba(levelColor, 0.15)
                                            : 'rgba(18,18,18,0.1)'
                                          : 'transparent',
                                      },
                                    }),
                              }}
                            >
                              <Typography
                                className="level-name"
                                sx={{ color: isSelected ? `${levelColor}` : '#FFF' }}
                              >
                                {levelLabelMap[type]}
                              </Typography>
                              <Typography className="level-price" color="text.primary">
                                ${price}
                              </Typography>
                              <Typography className="level-type" color="text.primary">
                                {iconTypeMap[type].join(', ')}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}
                </>
              ) : showAgreement ? (
                <LegalAgreementStep
                  agreed={agreed}
                  setAgreed={setAgreed}
                  onCancel={() => {
                    setShowAgreement(false);
                    setShowAgreementError(false);
                  }}
                  beat={beat}
                  selectedDownloadType={selectedDownloadType}
                  selectedLicense={selectedLicense}
                  playButton={playButton}
                />
              ) : (
                <CheckoutStep
                  onBack={() => {
                    setShowCheckout(false);
                    setShowAgreement(true);
                  }}
                  onComplete={() => {
                    setShowCheckout(false);
                    show('Purchase completed successfully!', 'success');
                    handleClose();
                  }}
                  beat={beat}
                  selectedDownloadType={selectedDownloadType}
                  selectedLicense={selectedLicense}
                  playButton={playButton}
                  onRequestAuth={onRequestAuth}
                  onDownloadStateChange={setIsDownloading}
                />
              )}
              <>
                {isLoggedIn && !showCheckout && (
                  <Box className="actions-container">
                    {!showAgreement ? (
                      <Button
                        variant="outlined"
                        onClick={handleClose}
                        className="cancel-btn"
                        startIcon={<Close sx={{ fontSize: '20px' }} />}
                      >
                        Close
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        onClick={() => setShowAgreement(false)}
                        className="cancel-btn"
                        startIcon={<ArrowBackRounded sx={{ fontSize: '20px' }} />}
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      className="continue-btn"
                      onClick={() => {
                        if (!isLoggedIn) {
                          setShowSelectionError(false);
                          setShowAgreementError(false);
                          return;
                        }
                        if (!selectedDownloadType) {
                          setShowSelectionError(true);
                          return;
                        }
                        if (!agreed && showAgreement) {
                          setShowAgreementError(true);
                          return;
                        }
                        if (agreed && showAgreement) {
                          setShowCheckout(true);
                          setShowAgreement(false);
                          return;
                        }
                        setShowSelectionError(false);
                        setShowAgreement(true);
                        setShowAgreementError(false);
                      }}
                      sx={{
                        cursor: 'pointer',
                        boxShadow: '0px 1px 4px rgba(0,0,0,0.2)',
                        border: `1px solid ${lightenColor(dominantColor ?? '#121212', 0.1)}`,
                        color: `${lightenColor(dominantColor ?? '#121212', 0.1)}`,
                        '&:hover': {
                          backgroundColor: alpha(
                            lightenColor(dominantColor ?? '#121212', 0.1),
                            0.2,
                          ),
                        },
                      }}
                    >
                      Continue <ArrowForward sx={{ marginLeft: '4px' }} />
                    </Button>
                  </Box>
                )}

                {showSelectionError && isLoggedIn && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 1, fontStyle: 'italic', display: 'block' }}
                  >
                    Please select a download type before continuing.
                  </Typography>
                )}
                {showAgreementError && showAgreement && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 1, fontStyle: 'italic', display: 'block' }}
                  >
                    Please agree to the terms before continuing.
                  </Typography>
                )}
              </>
            </Box>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default BeatDrawer;
