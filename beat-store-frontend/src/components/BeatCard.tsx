import { Box, Typography, Chip, IconButton } from '@mui/material';
import { PlayArrowRounded, FileDownloadRounded, PauseRounded } from '@mui/icons-material';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';

import { genreColors } from '@/constants/genreColors';
import '@/components/Style/beatcard.scss';

interface BeatCardProps extends BeatType {
  onClick?: () => void;
}

const BeatCard = ({ id, name, cover_art, genre, snippet_mp3, onClick }: BeatCardProps) => {
  const { currentBeatId, isPlaying, play, pause, setBeat } = usePlaybackStore();

  const isCurrent = currentBeatId === id;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrent) {
      setBeat(id, snippet_mp3);
    } else {
      isPlaying ? pause() : play();
    }
  };

  return (
    <Box className={`beat-card ${isCurrent && isPlaying ? 'playing' : ''}`} onClick={onClick}>
      <Box className="cover-container">
        <img className="cover-art" src={cover_art} alt={name} />
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
            <FileDownloadRounded className="download-icon" />
          </Box>
        </Box>
      </Box>
      <Box display="flex" gap={1} mt={1}></Box>
    </Box>
  );
};

export default BeatCard;
