import { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, IconButton, Avatar, Chip, Skeleton } from '@mui/material';
import {
  PlayArrowRounded,
  FileDownloadRounded,
  PauseRounded,
  CheckCircle,
} from '@mui/icons-material';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';
import { useBeatPurchaseCheck } from '@/hooks/useBeatPurchaseCheck';

import Waveform from '@/components/Waveform';

import { genreColors } from '@/constants/genreColors';
import { get30SecondSnippetUrl, releaseBlobUrl } from '@/utils/audioUtils';

import '@/components/Style/beatrow.scss';

/**
 * Generate a consistent random color based on a string
 */
const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate vibrant colors (avoid too dark or too light)
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Normalize scale display: capitalize "Major" and "Minor" while keeping the note as is
 */
const normalizeScaleDisplay = (scale: string): string => {
  const parts = scale.split(' ');
  if (parts.length < 2) return scale;
  const [note, type] = parts;
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'major') return `${note} Major`;
  if (normalizedType === 'minor') return `${note} Minor`;
  return scale;
};

interface BeatRowProps extends BeatType {
  onClick?: () => void;
}

const BeatRow = ({
  id,
  name,
  genre,
  bpm,
  scale,
  cover_art,
  snippet_mp3,
  mp3_file,
  onClick,
}: BeatRowProps) => {
  const { currentBeatId, isPlaying, play, pause, setBeat } = usePlaybackStore();

  const isCurrent = currentBeatId === id;

  // Check if beat has been purchased (any download type)
  const isPurchased = useBeatPurchaseCheck(id);

  // State for frontend-generated snippet URL
  const [frontendSnippetUrl, setFrontendSnippetUrl] = useState<string | null>(null);
  const snippetUrlRef = useRef<string | null>(null);

  // Use snippet_mp3 if available, otherwise create 30-second snippet from mp3_file in frontend
  useEffect(() => {
    // Release previous blob URL reference if it exists
    if (snippetUrlRef.current) {
      releaseBlobUrl(snippetUrlRef.current);
      snippetUrlRef.current = null;
    }

    if (snippet_mp3) {
      // Backend snippet exists, use it
      setFrontendSnippetUrl(null);
    } else if (mp3_file) {
      // Generate 30-second snippet from mp3_file in frontend
      get30SecondSnippetUrl(mp3_file)
        .then(url => {
          if (url) {
            snippetUrlRef.current = url;
            setFrontendSnippetUrl(url);
          }
        })
        .catch(error => {
          console.error(`Failed to create snippet for "${name}":`, error);
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
  }, [snippet_mp3, mp3_file, name]);

  // Use snippet_mp3 if available, otherwise use frontend-generated snippet, fallback to mp3_file
  const waveformUrl = snippet_mp3 || frontendSnippetUrl || mp3_file || null;

  // Use snippet_mp3 if available, otherwise use frontend-generated snippet, fallback to mp3_file for playback
  const audioUrl = snippet_mp3 || frontendSnippetUrl || mp3_file || null;

  // Generate consistent random background color for fallback
  const fallbackColor = useMemo(() => generateColorFromString(name), [name]);

  // Waveform loading state
  const [isWaveformLoading, setIsWaveformLoading] = useState(true);
  const waveformLoadStartTime = useRef<number | null>(null);

  // Manage waveform loading state with minimum 500ms display time
  useEffect(() => {
    if (waveformUrl) {
      setIsWaveformLoading(true);
      waveformLoadStartTime.current = Date.now();

      // Log snippet_mp3 duration to verify it's 30 seconds
      if (snippet_mp3) {
        const audio = new Audio(snippet_mp3);
        audio.addEventListener('loadedmetadata', () => {
          console.log(`snippet_mp3 duration for "${name}": ${audio.duration} seconds`);
        });
      }
    } else {
      setIsWaveformLoading(false);
    }
  }, [waveformUrl, snippet_mp3, name]);

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

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrent && audioUrl) {
      setBeat(id, audioUrl);
    } else {
      isPlaying ? pause() : play();
    }
  };

  return (
    <Box className={`beat-row ${isPurchased ? 'purchased' : ''}`} onClick={onClick}>
      <Box
        className={`cover-art-container ${isCurrent && isPlaying ? 'is-playing' : ''}`}
        onClick={e => {
          e.stopPropagation();
          handlePlayPause(e);
        }}
        sx={{
          position: 'relative',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        {cover_art ? (
          <Avatar
            className="cover-art"
            src={cover_art}
            alt={name}
            sx={{
              width: 24,
              height: 24,
            }}
          />
        ) : (
          <Box
            className="cover-art"
            sx={{
              width: 24,
              height: 24,
              backgroundColor: fallbackColor,
              color: '#fff',
              fontWeight: 600,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontSize: '12px',
                textShadow: '2px 2px 8px rgba(0, 0, 0, 0.4)',
              }}
            >
              {name}
            </Typography>
          </Box>
        )}
        {/* Dark overlay on hover or when playing */}
        <Box
          className="cover-art-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isCurrent && isPlaying ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out',
            pointerEvents: 'none',
          }}
        />
        {/* Play button over cover art */}
        <IconButton
          className="play-btn-overlay"
          onClick={e => {
            e.stopPropagation();
            handlePlayPause(e);
          }}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'transparent',
            width: '40px',
            height: '40px',
            opacity: isCurrent && isPlaying ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: isCurrent && isPlaying ? 'auto' : 'none',
            '&:hover': {
              backgroundColor: 'transparent',
            },
            '& .MuiSvgIcon-root': {
              color: '#fff',
            },
          }}
        >
          {isCurrent && isPlaying ? (
            <PauseRounded sx={{ fontSize: '36px', color: '#fff' }} />
          ) : (
            <PlayArrowRounded sx={{ fontSize: '36px', color: '#fff' }} />
          )}
        </IconButton>
      </Box>

      <Box className="info">
        <Typography className="beat-name" sx={{ fontSize: '16px' }}>
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bpm}bpm • {normalizeScaleDisplay(scale)}
        </Typography>
        <Box className="meta-info">
          <Chip
            className="chip"
            label={genre}
            size="small"
            sx={{
              backgroundColor: genreColors[genre],
            }}
          />
        </Box>
      </Box>
      <Box
        sx={{
          width: '100%',
          height: 60,
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
              top: '50%',
              left: 0,
              transform: 'translateY(-50%)',
            }}
          />
        )}
        <Box
          sx={{
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
            opacity: isWaveformLoading ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          {waveformUrl && (
            <Waveform
              url={waveformUrl}
              isCurrent={isCurrent}
              beatId={id}
              onReady={handleWaveformReady}
            />
          )}
        </Box>
      </Box>

      <Box className="beat-row-actions">
        {isPurchased ? (
          <CheckCircle className="check-icon" sx={{ color: '#1db954' }} />
        ) : (
          <FileDownloadRounded className="download-icon" />
        )}
      </Box>
    </Box>
  );
};

export default BeatRow;
