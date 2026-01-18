import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { get30SecondSnippetUrl, releaseBlobUrl } from '@/utils/audioUtils';

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
  Skeleton,
} from '@mui/material';
import {
  Close,
  PlayArrowRounded,
  PauseRounded,
  ArrowForward,
  ArrowBackRounded,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

// @ts-ignore
import ColorThief from 'colorthief';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { useResponsive } from '@/hooks/useResponsive';

import Waveform from '@/components/Waveform';
import LegalAgreementStep from '@/components/LegalAgreementStep';
import CheckoutStep from '@/components/CheckoutStep';
import DownloadLoading from '@/components/DownloadLoading';
import EditProfile from '@/components/EditProfile';
import AlreadyPurchasedModal from '@/components/AlreadyPurchasedModal';

import { genreColors } from '@/constants/genreColors';
import { iconTypeMap, levelColorMap, levelLabelMap } from '@/constants/licenseMaps';
import { useCheckPurchaseQuery, useDownloadBeatMutation } from '@/store/beatApi';
import JSZip from 'jszip';
import { generateLicenseAgreementPDF } from '@/utils/pdfUtils';
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

const darkenColor = (rgbStr: string, factor = 0.5) => {
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return rgbStr;
  let [r, g, b] = match.map(Number);
  r = Math.max(0, Math.round(r * (1 - factor)));
  g = Math.max(0, Math.round(g * (1 - factor)));
  b = Math.max(0, Math.round(b * (1 - factor)));
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
  const { isSmallScreen, isVerySmallScreen } = useResponsive();

  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSelectionError, setShowSelectionError] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreementError, setShowAgreementError] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const { show } = useToastStore();

  const imgRef = useRef<HTMLImageElement>(null);

  const { currentBeatId, isPlaying, play, pause, setBeat } = usePlaybackStore();
  const isCurrent = beat?.id === currentBeatId;

  // Authentication state
  const { login, isLoggedIn, userProfile } = useAuthStore();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAlreadyPurchasedModal, setShowAlreadyPurchasedModal] = useState(false);

  // Waveform loading state
  const [isWaveformLoading, setIsWaveformLoading] = useState(true);
  const waveformLoadStartTime = useRef<number | null>(null);

  // Download mutation
  const [downloadBeat, { isLoading: isDownloadingBeat }] = useDownloadBeatMutation();

  // Check if beat was already purchased when drawer opens
  const { data: purchaseCheck } = useCheckPurchaseQuery(
    {
      beatId: beat?.id ?? 0,
      downloadType: selectedDownloadType ?? 'mp3',
    },
    {
      skip: !beat || !selectedDownloadType || !isLoggedIn || !open,
    },
  );

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

  // State for frontend-generated snippet URL
  const [frontendSnippetUrl, setFrontendSnippetUrl] = useState<string | null>(null);
  const snippetUrlRef = useRef<string | null>(null);

  // Generate 30-second snippet from mp3_file if snippet_mp3 doesn't exist
  useEffect(() => {
    // Release previous blob URL reference if it exists
    if (snippetUrlRef.current) {
      releaseBlobUrl(snippetUrlRef.current);
      snippetUrlRef.current = null;
    }

    if (!beat) {
      setFrontendSnippetUrl(null);
      return;
    }

    if (beat.snippet_mp3) {
      // Backend snippet exists, use it
      setFrontendSnippetUrl(null);
    } else if (beat.mp3_file) {
      // Generate 30-second snippet from mp3_file in frontend
      get30SecondSnippetUrl(beat.mp3_file)
        .then(url => {
          if (url) {
            snippetUrlRef.current = url;
            setFrontendSnippetUrl(url);
          }
        })
        .catch(error => {
          console.error(`Failed to create snippet for "${beat.name}":`, error);
        });
    } else {
      setFrontendSnippetUrl(null);
    }

    // Cleanup: release blob URL reference when component unmounts or URL changes
    return () => {
      if (snippetUrlRef.current) {
        releaseBlobUrl(snippetUrlRef.current);
        snippetUrlRef.current = null;
      }
    };
  }, [beat?.snippet_mp3, beat?.mp3_file, beat?.name]);

  // Use snippet_mp3 if available, otherwise use frontend-generated snippet, fallback to mp3_file
  const audioUrl = beat ? beat.snippet_mp3 || frontendSnippetUrl || beat.mp3_file || null : null;

  // Generate consistent random background color for fallback
  const fallbackColor = useMemo(() => {
    if (!beat?.name) return 'hsl(0, 0%, 50%)';
    let hash = 0;
    for (let i = 0; i < beat.name.length; i++) {
      hash = beat.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20);
    const lightness = 45 + (Math.abs(hash) % 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, [beat?.name]);

  // Convert HSL to RGB for color manipulation
  const hslToRgb = (hsl: string): string => {
    const match = hsl.match(/\d+/g);
    if (!match || match.length < 3) return 'rgb(121, 121, 121)';
    const h = parseInt(match[0]) / 360;
    const s = parseInt(match[1]) / 100;
    const l = parseInt(match[2]) / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!beat || !audioUrl) return;
    if (!isCurrent) {
      setBeat(beat.id, audioUrl);
    } else {
      isPlaying ? pause() : play();
    }
  };

  useEffect(() => {
    if (!beat) {
      setDominantColor(null);
      return;
    }

    // If no cover art, use fallback color as dominant color
    if (!beat.cover_art) {
      const rgbFallback = hslToRgb(fallbackColor);
      setDominantColor(rgbFallback);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // set BEFORE src
    const url = beat.cover_art + (beat.cover_art.includes('?') ? '&cf=' : '?cf=') + Date.now();
    img.src = url;

    img.onload = () => {
      try {
        // Ensure image is fully loaded
        if (img.complete && img.naturalWidth > 0) {
          const ct = new ColorThief();
          const [r, g, b] = ct.getColor(img, 25);
          setDominantColor(`rgb(${r}, ${g}, ${b})`);
        } else {
          // Fallback to generated color if image not ready
          const rgbFallback = hslToRgb(fallbackColor);
          setDominantColor(rgbFallback);
        }
      } catch {
        // Fallback to generated color on error
        const rgbFallback = hslToRgb(fallbackColor);
        setDominantColor(rgbFallback);
      }
    };
    img.onerror = () => {
      // Fallback to generated color on load error
      const rgbFallback = hslToRgb(fallbackColor);
      setDominantColor(rgbFallback);
    };
  }, [beat?.cover_art, beat, fallbackColor]);

  // Show already purchased modal when purchase is detected, hide main drawer
  useEffect(() => {
    if (open && purchaseCheck?.has_purchase === true && isLoggedIn && selectedDownloadType) {
      setShowAlreadyPurchasedModal(true);
    } else if (!open || !purchaseCheck?.has_purchase) {
      setShowAlreadyPurchasedModal(false);
    }
  }, [open, purchaseCheck?.has_purchase, isLoggedIn, selectedDownloadType]);

  // Handle download for already purchased beat
  const handleDownload = useCallback(async () => {
    if (!beat || !selectedDownloadType) return;

    try {
      setIsDownloading(true);

      // Use RTK Query mutation for download
      const beatBlob = await downloadBeat({
        beatId: beat.id,
        downloadType: selectedDownloadType,
      }).unwrap();

      // Generate License Agreement PDF
      const fullName = userProfile
        ? [
            userProfile.first_name,
            userProfile.middle_initial ? `${userProfile.middle_initial}.` : null,
            userProfile.last_name,
          ]
            .filter(Boolean)
            .join(' ')
        : 'User';

      const pdfBlob = generateLicenseAgreementPDF({
        beatName: beat.name,
        downloadType: selectedDownloadType,
        signatureName: fullName,
        date: new Date().toLocaleDateString(),
      });

      // Create zip file
      const zip = new JSZip();

      // Add beat file to zip
      const fileExtension = selectedDownloadType === 'stems' ? 'zip' : selectedDownloadType;
      const beatFileName = `${beat.name}_${selectedDownloadType}.${fileExtension}`;
      zip.file(beatFileName, beatBlob);

      // Add PDF to zip
      zip.file('License_Agreement.pdf', pdfBlob);

      // Generate zip blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${beat.name}_${selectedDownloadType}_with_license.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      show('Download failed. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [beat, selectedDownloadType, downloadBeat, userProfile, show]);

  // Manage waveform loading state with minimum 500ms display time
  useEffect(() => {
    if (open && audioUrl) {
      setIsWaveformLoading(true);
      waveformLoadStartTime.current = Date.now();
    } else {
      setIsWaveformLoading(false);
    }
  }, [open, audioUrl]);

  // Handle waveform ready callback with minimum 500ms display time
  const handleWaveformReady = () => {
    if (waveformLoadStartTime.current) {
      const elapsed = Date.now() - waveformLoadStartTime.current;
      const minDisplayTime = 500;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      setTimeout(() => {
        setIsWaveformLoading(false);
        waveformLoadStartTime.current = null;
      }, remainingTime);
    } else {
      setIsWaveformLoading(false);
    }
  };

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
      setShowAlreadyPurchasedModal(false);
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
    setShowAlreadyPurchasedModal(false);

    // Call the parent's onClose function
    onClose();
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
    } catch {
      setLoginError('Invalid username or password');
    }
  };

  return (
    <>
      {/* Already Purchased Modal */}
      <AlreadyPurchasedModal
        open={showAlreadyPurchasedModal}
        onClose={() => {
          setShowAlreadyPurchasedModal(false);
          handleClose(); // Close the drawer when modal closes
        }}
        beat={beat ?? null}
        downloadType={selectedDownloadType ?? null}
        onDownload={handleDownload}
        onUpgrade={(upgradeType: 'wav' | 'stems') => {
          setShowAlreadyPurchasedModal(false);
          setSelectedDownloadType(upgradeType);
          // The drawer will remain open with the new download type selected
        }}
        isDownloading={isDownloading || isDownloadingBeat}
      />

      {/* Download Loading Overlay */}
      <DownloadLoading
        isVisible={isDownloading || isDownloadingBeat}
        downloadType={selectedDownloadType || 'mp3'}
        beatName={beat?.name || 'Beat'}
      />

      <Modal
        open={
          open &&
          !!beat &&
          !(purchaseCheck?.has_purchase === true && isLoggedIn && selectedDownloadType)
        }
        onClose={handleClose}
        aria-labelledby="beat-drawer-modal-title"
        aria-describedby="beat-drawer-modal-description"
        sx={{
          display: 'flex',
          alignItems: isSmallScreen ? 'flex-start' : 'center',
          justifyContent: 'center',
        }}
        slotProps={{
          backdrop: {
            style: {
              background: dominantColor
                ? `linear-gradient(to bottom, ${alpha(dominantColor, 0.2)} 0%, ${alpha(dominantColor, 0)} 50%, rgba(0, 0, 0, ${isSmallScreen ? 0.9 : 0}) 100%)`
                : isSmallScreen
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'rgba(0, 0, 0, 0)',
              backdropFilter: isSmallScreen ? 'blur(8px)' : 'blur(2px) saturate(160%)',
            },
          },
        }}
      >
        <Box
          className="beat-drawer"
          sx={{
            ...(isSmallScreen && {
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              margin: 0,
              borderRadius: 0,
            }),
          }}
        >
          {beat && (
            <Box
              className="drawer-content"
              sx={{
                p: 2,
                borderRadius: isSmallScreen ? 0 : '12px',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                background: dominantColor
                  ? `linear-gradient(to bottom, ${alpha(darkenColor(dominantColor, 0.7), 1)} 0%, rgba(var(--beat-palette-background-defaultChannel) / .6) 66%)`
                  : mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.2)'
                    : 'rgba(188, 188, 188, 0.2)',
                color: '#fff',
                ...(isSmallScreen && {
                  height: '100%',
                  overflow: 'auto',
                }),
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  borderRadius: isSmallScreen ? 0 : '12px',
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
                    {beat.cover_art ? (
                      <img
                        ref={imgRef}
                        src={beat.cover_art ?? undefined}
                        alt={beat.name}
                        crossOrigin="anonymous"
                        className="beat-cover-art"
                        style={isSmallScreen ? { transform: 'scale(0.9)' } : undefined}
                      />
                    ) : (
                      <Box
                        className="beat-cover-art"
                        sx={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: fallbackColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          textAlign: 'center',
                          padding: '16px',
                          fontSize: isSmallScreen ? '14px' : '18px',
                          fontWeight: 600,
                          lineHeight: 1.2,
                        }}
                      >
                        {!isVerySmallScreen && beat.name}
                      </Box>
                    )}
                    <Box className="info">
                      <Typography
                        variant="h6"
                        fontSize={isSmallScreen ? '16px' : '20px'}
                        color="text.primary"
                      >
                        {beat.name}
                      </Typography>
                      <Box className="meta-info">
                        <Chip
                          label={beat.genre}
                          size="small"
                          className="genre-chep"
                          sx={{
                            backgroundColor: genreColors[beat.genre],
                            fontSize: isSmallScreen ? '0.7rem' : undefined,
                          }}
                        />
                        <Typography
                          variant="body2"
                          color="text.primary"
                          sx={{
                            opacity: '.8',
                            fontSize: isSmallScreen ? '0.75rem' : undefined,
                          }}
                        >
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
                        opacity: 0.8,
                        transition: 'all ease-in-out 0.2s',
                        backgroundColor: dominantColor,
                        '&:hover': {
                          opacity: 1,
                          backgroundColor: dominantColor
                            ? rgbStringToRgba(dominantColor, 1) // dark overlay from extracted color
                            : 'rgba(18, 18, 18, 0.2)', // fallback with alpha
                        },
                      }}
                    >
                      {isCurrent && isPlaying ? (
                        <PauseRounded
                          sx={{
                            fontSize: isSmallScreen ? 24 : 32,
                            color: '#FFF',
                          }}
                        />
                      ) : (
                        <PlayArrowRounded
                          sx={{
                            fontSize: isSmallScreen ? 24 : 32,
                            color: '#FFF',
                          }}
                        />
                      )}
                    </IconButton>
                    <Box
                      sx={{
                        width: '100%',
                        height: 40,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {isWaveformLoading && (
                        <Skeleton
                          variant="circular"
                          width="100%"
                          animation="wave"
                          height={36}
                          sx={{
                            borderRadius: '100px',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                          }}
                        />
                      )}
                      <Box
                        sx={{
                          width: '100%',
                          opacity: isWaveformLoading ? 0 : 1,
                          transition: 'opacity 0.5s ease-in-out',
                        }}
                      >
                        {audioUrl && beat && (
                          <Waveform
                            url={audioUrl}
                            isCurrent={isCurrent}
                            beatId={beat.id}
                            height={isSmallScreen ? 32 : 40}
                            progressColor={'#ffffff'}
                            waveColor={'#8F8F8F'}
                            onReady={handleWaveformReady}
                          />
                        )}
                      </Box>
                    </Box>
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
                          fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
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
                      {selectedDownloadType
                        ? iconTypeMap[selectedDownloadType].map((iconType, index) => (
                            <Chip
                              key={index}
                              label={iconType.toUpperCase()}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontSize: isSmallScreen ? '0.65rem' : '0.75rem',
                                fontWeight: 500,
                              }}
                            />
                          ))
                        : null}
                    </Box>

                    {/* Total Price */}
                    <Box className="total-price-container">
                      <Typography
                        variant="body2"
                        className="total-price-label"
                        sx={{ fontSize: isSmallScreen ? '0.8rem' : undefined }}
                      >
                        Total:
                      </Typography>
                      <Typography
                        variant="h6"
                        className="total-price"
                        sx={{
                          color: selectedDownloadType
                            ? levelColorMap[selectedDownloadType]
                            : 'rgba(255, 255, 255, 0.5)',
                          fontSize: isSmallScreen ? '1rem' : undefined,
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
                          fontSize: isSmallScreen ? '1rem' : '1.25rem',
                          textAlign: 'left',
                          mb: 2,
                          width: '100%',
                        }}
                      >
                        Sign in to download
                      </Typography>

                      {/* Social Login Buttons */}
                      {/* <Box
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
                            fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
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
                            fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
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
                            fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
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
                      </Box> */}

                      {/* Divider */}
                      {/* <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 2 }}>
                        <Divider sx={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
                        <Typography
                          sx={{ px: 2, color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}
                        >
                          or
                        </Typography>
                        <Divider sx={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
                      </Box> */}

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
                          label="Username"
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
                                fontSize: isSmallScreen ? '0.8rem' : '0.875rem',
                                py: 1.5,
                                px: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: isSmallScreen ? '0.8rem' : '0.875rem',
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
                                fontSize: isSmallScreen ? '0.8rem' : '0.875rem',
                                py: 1.5,
                                px: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: isSmallScreen ? '0.8rem' : '0.875rem',
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
                            fontSize: isSmallScreen ? '0.8rem' : '0.875rem',
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
                              fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
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
                              fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
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
                        sx={{
                          paddingLeft: '20px',
                          paddingBottom: '8px',
                          fontSize: isSmallScreen ? '0.9rem' : undefined,
                        }}
                      >
                        Licensing
                      </Typography>
                      <Box display="flex" className="levels-row">
                        {downloadTypes.map(type => {
                          const key = priceMap[type];
                          const price = beat?.[key] ?? 'Not Available';
                          const levelColor = levelColorMap[type];
                          const isSelected = selectedDownloadType === type;
                          const isDisabled = price === 'Not Available';

                          return (
                            <Box
                              key={type}
                              onClick={isDisabled ? undefined : () => setSelectedDownloadType(type)}
                              className="level-box"
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: '1 1 0',
                                minWidth: 0,

                                cursor: isDisabled ? 'not-allowed' : 'pointer',
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
                                opacity: isDisabled ? 0.5 : 1,
                                transition: 'all 0.2s ease-in-out',
                                ...(isSelected
                                  ? {}
                                  : {
                                      '&:hover': isDisabled
                                        ? {}
                                        : {
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
                                sx={{
                                  color: isSelected ? `${levelColor}` : '#FFF',
                                  fontSize: isSmallScreen ? '0.85rem' : undefined,
                                  opacity: isDisabled ? 0.6 : 1,
                                }}
                              >
                                {levelLabelMap[type]}
                              </Typography>
                              <Typography
                                className="level-price"
                                color="text.primary"
                                sx={{
                                  fontSize: isVerySmallScreen ? '0.7rem' : isSmallScreen ? '0.8rem' : undefined,
                                  opacity: isDisabled ? 0.6 : 1,
                                }}
                              >
                                {price}
                              </Typography>
                              <Typography
                                className="level-type"
                                color="text.primary"
                                sx={{
                                  fontSize: isVerySmallScreen ? '0.6rem' : isSmallScreen ? '0.7rem' : undefined,
                                  opacity: isDisabled ? 0.6 : 1,
                                }}
                              >
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
                  onEditProfile={() => setEditProfileOpen(true)}
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
                      disabled={!showAgreement && !showCheckout && !selectedDownloadType}
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
                        if (showAgreement) {
                          // Check if user has first_name and last_name
                          if (!userProfile?.first_name?.trim() || !userProfile?.last_name?.trim()) {
                            setShowAgreementError(true);
                            return;
                          }
                          if (!agreed) {
                            setShowAgreementError(true);
                            return;
                          }
                          setShowCheckout(true);
                          setShowAgreement(false);
                          return;
                        }
                        setShowSelectionError(false);
                        setShowAgreement(true);
                        setShowAgreementError(false);
                      }}
                      sx={{
                        border: `1px solid ${lightenColor(dominantColor ?? '#121212', 0.1)}`,
                        color: `${lightenColor(dominantColor ?? '#121212', 0.1)}`,
                        backgroundColor: dominantColor
                          ? alpha(dominantColor, 1)
                          : 'rgba(29, 185, 84, 1)',
                        '&:hover:not(:disabled)': {
                          backgroundColor: dominantColor
                            ? alpha(dominantColor, 1)
                            : alpha('rgba(29, 185, 84, 1)', 0.9),
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

      {/* Edit Profile Modal */}
      <EditProfile open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </>
  );
};

export default BeatDrawer;
