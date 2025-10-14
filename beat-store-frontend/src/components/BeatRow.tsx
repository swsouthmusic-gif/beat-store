import { Box, Typography, IconButton, Avatar, Chip } from '@mui/material';
import { PlayArrowRounded, FileDownloadRounded, PauseRounded } from '@mui/icons-material';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';

import Waveform from '@/components/Waveform';

import { genreColors } from '@/constants/genreColors';

import '@/components/Style/beatrow.scss';

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
  onClick,
}: BeatRowProps) => {
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
    <Box className="beat-row" onClick={onClick}>
      <Avatar className="cover-art" src={cover_art} alt={name} />

      <Box className="info">
        <Typography className="beat-name" sx={{ fontSize: '16px' }}>
          {name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            paddingLeft: '4px',
          }}
        >
          {bpm}bpm • {scale}
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
      <Waveform url={snippet_mp3} isCurrent={isCurrent} />

      <Box className="beat-row-actions">
        <FileDownloadRounded className="download-icon" />
        <IconButton
          className="play-btn"
          onClick={e => {
            e.stopPropagation();
            handlePlayPause(e);
          }}
        >
          {isCurrent && isPlaying ? (
            <PauseRounded sx={{ fontSize: '36px', color: '#000' }} />
          ) : (
            <PlayArrowRounded sx={{ fontSize: '36px', color: '#000' }} />
          )}
        </IconButton>
      </Box>
    </Box>
  );
};

export default BeatRow;
