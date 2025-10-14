// /components/AudioPlayer.tsx
import { useEffect, useRef } from 'react';
import { Box, IconButton, Typography, Avatar, Chip } from '@mui/material';
import {
  PlayArrowRounded,
  PauseRounded,
  SkipNextRounded,
  SkipPreviousRounded,
  FileDownloadRounded,
} from '@mui/icons-material';

import type { BeatType } from '@/store/beatApi';
import { usePlaybackStore } from '@/store/playBackStore';
import { useGetBeatsQuery } from '@/store/beatApi';
import { genreColors } from '@/constants/genreColors';

import '@/components/Style/audioPlayer.scss';

interface AudioPlayerProps {
  onDownloadClick?: (beat: BeatType) => void;
}

const AudioPlayer = ({ onDownloadClick }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
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
  } = usePlaybackStore();

  const { data: beats = [] } = useGetBeatsQuery();

  // Set beats in store when they're loaded
  useEffect(() => {
    if (beats.length > 0) {
      setBeats(beats);
    }
  }, [beats, setBeats]);

  // Get current beat info
  const currentBeat = beats.find(beat => beat.id === currentBeatId);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioUrl) audio.src = audioUrl;

    if (isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [audioUrl, isPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [setCurrentTime]);

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

  // Don't render the player if no beat is selected
  if (!currentBeat) {
    return <audio ref={audioRef} id="global-audio" />;
  }

  return (
    <>
      <audio ref={audioRef} id="global-audio" />

      {/* Global Audio Player Container */}
      <Box ref={playerContainerRef} className="audio-player">
        {/* Beat Info */}
        <Box className="beat-info">
          <Avatar src={currentBeat.cover_art} alt={currentBeat.name} className="cover-art" />
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
        </Box>

        {/* Playback Controls */}
        <Box className="playback-controls">
          <IconButton className="control-btn" onClick={handlePrevious}>
            <SkipPreviousRounded className="skip-icon" />
          </IconButton>

          <IconButton className="control-btn play-pause-btn" onClick={handlePlayPause}>
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
        <Box className="progress-section">
          <Box className="progress-container">
            <Box
              className="progress-bar"
              style={{
                width: `${(currentTime / 30) * 100}%`, // Assuming 30 seconds for snippets
              }}
            />
          </Box>
        </Box>
        <Box className="actions">
          <IconButton onClick={() => currentBeat && onDownloadClick?.(currentBeat)}>
            <FileDownloadRounded className="download-icon" />
          </IconButton>
        </Box>
      </Box>
    </>
  );
};

export default AudioPlayer;
