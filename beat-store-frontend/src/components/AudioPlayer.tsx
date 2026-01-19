// /components/AudioPlayer.tsx
import { useEffect, useRef, useMemo, useState } from 'react';
import { Box, IconButton, Typography, Chip, useColorScheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  PlayArrowRounded,
  PauseRounded,
  SkipNextRounded,
  SkipPreviousRounded,
  FileDownloadRounded,
  CloseRounded,
  CheckCircle,
} from '@mui/icons-material';

// @ts-ignore
import ColorThief from 'colorthief';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';
import { useGetBeatsQuery } from '@/store/beatApi';
import { genreColors } from '@/constants/genreColors';
import { useWaveformStore } from '@/store/waveformStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useBeatPurchaseCheck } from '@/hooks/useBeatPurchaseCheck';

import '@/components/Style/audioPlayer.scss';

interface AudioPlayerProps {
  onDownloadClick?: (beat: BeatType) => void;
}

const AudioPlayer = ({ onDownloadClick }: AudioPlayerProps) => {
  const { mode } = useColorScheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const { isSmallScreen } = useResponsive();
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const {
    audioUrl,
    isPlaying,
    currentBeatId,
    setCurrentTime,
    currentTime,
    play,
    pause,
    nextBeat,
    previousBeat,
    setBeats,
    isAudioPlayerVisible,
    setIsAudioPlayerVisible,
  } = usePlaybackStore();

  const { setCurrentBeat } = useWaveformStore();

  const { data: beats = [] } = useGetBeatsQuery();

  // Set beats in store when they're loaded
  useEffect(() => {
    if (beats.length > 0) {
      setBeats(beats);
    }
  }, [beats, setBeats]);

  // Get current beat info
  const currentBeat = beats.find(beat => beat.id === currentBeatId);

  // Check if beat is purchased (any download type)
  const isPurchased = useBeatPurchaseCheck(currentBeatId ?? 0);

  // Generate consistent random background color for fallback
  const fallbackColor = useMemo(() => {
    if (!currentBeat?.name) return 'hsl(0, 0%, 50%)';
    let hash = 0;
    for (let i = 0; i < currentBeat.name.length; i++) {
      hash = currentBeat.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20);
    const lightness = 45 + (Math.abs(hash) % 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, [currentBeat?.name]);

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

  // Convert RGB string to RGBA for box-shadow
  const rgbStringToRgba = (rgbStr: string, alpha: number) => {
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return rgbStr;
    const [r, g, b] = match;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Darken RGB color for gradient
  const darkenColor = (rgbStr: string, factor = 0.5) => {
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return rgbStr;
    let [r, g, b] = match.map(Number);
    r = Math.max(0, Math.round(r * (1 - factor)));
    g = Math.max(0, Math.round(g * (1 - factor)));
    b = Math.max(0, Math.round(b * (1 - factor)));
    return `rgb(${r}, ${g}, ${b})`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioUrl) {
      // If URL changed, reload the audio element
      if (audio.src !== audioUrl) {
        audio.src = audioUrl;
        audio.load();
      }
    }

    // Handle play/pause
    if (isPlaying && audioUrl) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing audio:', error);
        });
      }
    } else {
      audio.pause();
    }
  }, [audioUrl, isPlaying]);

  // Track audio duration when metadata loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Also check if duration is already available
    if (audio.duration && isFinite(audio.duration)) {
      setAudioDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioUrl]);

  // Handle audio end event - stop playback when snippet reaches the end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      pause();
      setCurrentTime(0);
      if (audio) {
        audio.currentTime = 0;
      }
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [pause, setCurrentTime]);

  // Update waveform store when current beat changes
  useEffect(() => {
    if (currentBeatId) {
      setCurrentBeat(currentBeatId);
    }
  }, [currentBeatId, setCurrentBeat]);

  // Extract dominant color from cover art or use fallback
  useEffect(() => {
    if (!currentBeat) {
      setDominantColor(null);
      return;
    }

    // If no cover art, use fallback color as dominant color
    if (!currentBeat.cover_art) {
      const rgbFallback = hslToRgb(fallbackColor);
      setDominantColor(rgbFallback);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // set BEFORE src
    const url =
      currentBeat.cover_art + (currentBeat.cover_art.includes('?') ? '&cf=' : '?cf=') + Date.now();
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
  }, [currentBeat?.cover_art, currentBeat, fallbackColor]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current) {
        const currentTime = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        setCurrentTime(currentTime);

        // Update waveform progress for all instances
        if (currentBeatId && duration > 0) {
          const { updateProgress } = useWaveformStore.getState();
          updateProgress(currentBeatId, currentTime, duration);
        }
      }
    }, 100); // Update more frequently for smoother waveform sync
    return () => clearInterval(interval);
  }, [setCurrentTime, currentBeatId]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleNext = () => {
    nextBeat();
  };

  const handlePrevious = () => {
    previousBeat();
  };

  // Don't render the player if no beat is selected or if it's hidden
  if (!currentBeat || !isAudioPlayerVisible) {
    return <audio ref={audioRef} id="global-audio" />;
  }

  return (
    <>
      <audio ref={audioRef} id="global-audio" />

      {/* Global Audio Player Container */}
      <Box
        ref={playerContainerRef}
        className="audio-player"
        sx={{
          background: dominantColor
            ? `linear-gradient(to right, ${alpha(darkenColor(dominantColor, 0.8), 1)} 20%, rgba(var(--beat-palette-background-defaultChannel) / .5) 100%)`
            : mode === 'dark'
              ? 'rgba(0, 0, 0, 0.2)'
              : 'rgba(188, 188, 188, 0.2)',
          borderRadius: '100px',
          overflow: 'hidden',
        }}
      >
        {/* Beat Info */}
        <Box
          className="beat-info"
          sx={{
            minWidth: isSmallScreen ? 0 : '180px',
            flexShrink: 0,
          }}
        >
          {currentBeat.cover_art ? (
            <img src={currentBeat.cover_art} alt={currentBeat.name} className="cover-art" />
          ) : (
            <Box
              className="cover-art"
              sx={{
                width: '64px',
                height: '64px',
                backgroundColor: fallbackColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                textAlign: 'center',
                borderRadius: '100px',
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px',
              }}
            >
              {currentBeat.name.substring(0, 2).toUpperCase()}
            </Box>
          )}
          {!isSmallScreen && (
            <Box className="beat-details">
              <Typography className="beat-name">{currentBeat.name}</Typography>
              <Box className="beat-meta">
                <Chip
                  className="genre-chip"
                  label={currentBeat.genre}
                  size="small"
                  style={
                    {
                      '--genre-color': genreColors[currentBeat.genre] || '#666',
                    } as React.CSSProperties
                  }
                />
                <Typography className="beat-stats">
                  {currentBeat.bpm} BPM • {currentBeat.scale}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Playback Controls */}
        <Box className="playback-controls">
          <IconButton className="control-btn" onClick={handlePrevious}>
            <SkipPreviousRounded className="skip-icon" />
          </IconButton>

          <IconButton
            className="control-btn play-pause-btn"
            onClick={handlePlayPause}
            sx={{
              backgroundColor: dominantColor ? alpha(dominantColor, 0.8) : undefined,
              boxShadow: dominantColor
                ? `0 4px 16px ${rgbStringToRgba(dominantColor, 0.4)}, 0 0 0 1px ${rgbStringToRgba(dominantColor, 0.2)}`
                : undefined,
              '&:hover': {
                backgroundColor: dominantColor ? alpha(dominantColor, 1) : undefined,
                boxShadow: dominantColor
                  ? `0 6px 20px ${rgbStringToRgba(dominantColor, 0.5)}, 0 0 0 1px ${rgbStringToRgba(dominantColor, 0.3)}`
                  : undefined,
              },
            }}
          >
            {isPlaying ? (
              <PauseRounded className="pause-icon" />
            ) : (
              <PlayArrowRounded className="play-icon" />
            )}
          </IconButton>

          <IconButton className="control-btn" onClick={handleNext}>
            <SkipNextRounded className="skip-icon" />
          </IconButton>
        </Box>

        {/* Progress Bar */}
        {!isSmallScreen && (
          <Box className="progress-section">
            <Box className="progress-container">
              <Box
                className="progress-bar"
                style={{
                  width: audioDuration > 0 ? `${(currentTime / audioDuration) * 100}%` : '0%',
                  background: dominantColor
                    ? `linear-gradient(to right, ${rgbStringToRgba(dominantColor, 1)} 0%, ${darkenColor(dominantColor, 0.5)} 100%)`
                    : undefined,
                }}
              />
            </Box>
          </Box>
        )}
        <Box className="actions" sx={{ display: 'flex' }}>
          <IconButton onClick={() => currentBeat && onDownloadClick?.(currentBeat)}>
            {isPurchased ? (
              <CheckCircle className="check-icon" sx={{ color: '#1db954' }} />
            ) : (
              <FileDownloadRounded className="download-icon" />
            )}
          </IconButton>
          <IconButton
            onClick={() => setIsAudioPlayerVisible(false)}
            className="close-btn"
            sx={{
              opacity: 0.5,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            <CloseRounded className="close-icon" />
          </IconButton>
        </Box>
      </Box>
    </>
  );
};

export default AudioPlayer;
