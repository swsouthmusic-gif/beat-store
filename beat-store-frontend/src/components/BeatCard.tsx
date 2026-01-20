import { Box, Typography, Chip, IconButton } from '@mui/material';
import { PlayArrowRounded, FileDownloadRounded, PauseRounded, CheckCircle } from '@mui/icons-material';
import { useMemo, useEffect, useState, useRef } from 'react';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';
import { useBeatPurchaseCheck } from '@/hooks/useBeatPurchaseCheck';

import { genreColors } from '@/constants/genreColors';
import { get30SecondSnippetUrl, releaseBlobUrl } from '@/utils/audioUtils';
import '@/components/Style/beatcard.scss';

interface BeatCardProps extends BeatType {
  onClick?: () => void;
}

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

const BeatCard = ({
  id,
  name,
  cover_art,
  genre,
  snippet_mp3,
  mp3_file,
  onClick,
}: BeatCardProps) => {
  const { currentBeatId, isPlaying, play, pause, setBeat } = usePlaybackStore();
  const [isTouched, setIsTouched] = useState(false);

  const isCurrent = currentBeatId === id;

  // Check if beat has been purchased (any download type)
  const isPurchased = useBeatPurchaseCheck(id);

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
  const audioUrl = snippet_mp3 || frontendSnippetUrl || mp3_file || null;

  // Generate consistent random background color for fallback
  const fallbackColor = useMemo(() => generateColorFromString(name), [name]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrent && audioUrl) {
      setBeat(id, audioUrl);
    } else {
      isPlaying ? pause() : play();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsTouched(true);
  };

  const handleTouchEnd = () => {
    // Delay hiding to allow tap to register
    setTimeout(() => setIsTouched(false), 300);
  };

  return (
    <Box
      className={`beat-card ${isCurrent && isPlaying ? 'playing' : ''} ${isTouched ? 'touched' : ''} ${isPurchased ? 'purchased' : ''}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Box className="cover-container">
        {cover_art ? (
          <img 
            className="cover-art" 
            src={cover_art} 
            alt={name}
            style={{ width: '100%', height: '120px', objectFit: 'cover' }}
          />
        ) : (
          <Box
            className="cover-art"
            sx={{
              width: '100%',
              height: '120px',
              backgroundColor: fallbackColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              textAlign: 'center',
              padding: '8px',
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            <Typography
              variant="body1"
              className="cover-art-name"
              sx={{
                textShadow: '2px 2px 8px rgba(0, 0, 0, 0.4)',
              }}
            >
              {name}
            </Typography>
          </Box>
        )}
        <Box>
          <IconButton className="play-btn" onClick={handlePlayPause}>
            {isCurrent && isPlaying ? (
              <PauseRounded sx={{ fontSize: '36px', color: '#000' }} />
            ) : (
              <PlayArrowRounded sx={{ fontSize: '36px', color: '#000' }} />
            )}
          </IconButton>
        </Box>
      </Box>
      <Box className="info">
        <Typography variant="body1">{name}</Typography>
        <Box className="extra">
          <Chip
            className="chip"
            label={genre}
            size="small"
            sx={{
              backgroundColor: genreColors[genre],
              marginTop: '4px',
            }}
          />
          <Box className="visibility-stuff">
            {isPurchased ? (
              <CheckCircle className="check-icon" sx={{ color: '#1db954' }} />
            ) : (
              <FileDownloadRounded className="download-icon" />
            )}
          </Box>
        </Box>
      </Box>
      <Box display="flex" gap={1} mt={1}></Box>
    </Box>
  );
};

export default BeatCard;
