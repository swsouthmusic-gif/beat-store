import React from 'react';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import { Download, MusicNote } from '@mui/icons-material';
import { keyframes } from '@mui/system';

// Animated pulse for the download icon
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

// Floating animation for music notes
const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-10px) rotate(5deg);
    opacity: 1;
  }
`;

// Wave animation for the progress bar
const waveAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

interface DownloadLoadingProps {
  isVisible: boolean;
  downloadType: 'mp3' | 'wav' | 'stems';
  beatName: string;
}

const DownloadLoading: React.FC<DownloadLoadingProps> = ({ isVisible, downloadType, beatName }) => {
  if (!isVisible) return null;

  const getFileIcon = () => {
    switch (downloadType) {
      case 'stems':
        return '🎵';
      case 'wav':
        return '🎶';
      case 'mp3':
        return '🎧';
      default:
        return '🎵';
    }
  };

  const getFileTypeLabel = () => {
    switch (downloadType) {
      case 'stems':
        return 'Stems Package';
      case 'wav':
        return 'WAV File';
      case 'mp3':
        return 'MP3 File';
      default:
        return 'File';
    }
  };

  return (
    <Fade in={isVisible} timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            maxWidth: '400px',
            width: '90%',
          }}
        >
          {/* Animated Download Icon */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Outer pulsing ring */}
              <Box
                sx={{
                  position: 'absolute',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px solid rgba(29, 185, 84, 0.3)',
                  animation: `${pulseAnimation} 2s ease-in-out infinite`,
                }}
              />

              {/* Inner pulsing ring */}
              <Box
                sx={{
                  position: 'absolute',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: '2px solid rgba(29, 185, 84, 0.5)',
                  animation: `${pulseAnimation} 2s ease-in-out infinite 0.5s`,
                }}
              />

              {/* Download icon */}
              <Download
                sx={{
                  fontSize: '40px',
                  color: '#1db954',
                  animation: `${pulseAnimation} 2s ease-in-out infinite 1s`,
                }}
              />
            </Box>

            {/* Floating music notes */}
            <Box
              sx={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                fontSize: '24px',
                animation: `${floatAnimation} 3s ease-in-out infinite`,
              }}
            >
              {getFileIcon()}
            </Box>

            <Box
              sx={{
                position: 'absolute',
                bottom: '-20px',
                left: '-20px',
                fontSize: '20px',
                animation: `${floatAnimation} 3s ease-in-out infinite 1.5s`,
              }}
            >
              🎵
            </Box>
          </Box>

          {/* Beat Name */}
          <Typography
            variant="h5"
            sx={{
              color: '#fff',
              fontWeight: 600,
              mb: 1,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            {beatName}
          </Typography>

          {/* File Type */}
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 3,
              fontSize: '1.1rem',
            }}
          >
            {getFileTypeLabel()}
          </Typography>

          {/* Progress Bar */}
          <Box
            sx={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden',
              mb: 2,
            }}
          >
            <Box
              sx={{
                height: '100%',
                background: 'linear-gradient(90deg, #1db954, #1ed760, #1db954)',
                backgroundSize: '200% 100%',
                animation: `${waveAnimation} 2s linear infinite`,
                borderRadius: '3px',
              }}
            />
          </Box>

          {/* Loading Text */}
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontStyle: 'italic',
            }}
          >
            Preparing your download...
          </Typography>

          {/* Spinning loader */}
          <Box sx={{ mt: 2 }}>
            <CircularProgress
              size={24}
              thickness={4}
              sx={{
                color: '#1db954',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Fade>
  );
};

export default DownloadLoading;
