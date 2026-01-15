import { useState, useMemo, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useColorScheme,
  Tooltip,
} from '@mui/material';
import { Logout, Login, Edit } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import { usePlaybackStore } from '@/store/playBackStore';
import { useGetBeatsQuery } from '@/store/beatApi';
import EditProfile from '@/components/EditProfile';

import '@/components/Style/navbar.scss';

type Route = 'music-icon' | 'library' | null;

// Module-level variable to track if tooltip has been shown globally
let globalTooltipShown = false;

interface NavbarProps {
  onLogout: () => void;
  onSignin: () => void;
  currentRoute?: Route;
  onNavigate?: (route: Route) => void;
}

const Navbar = ({ onLogout, onSignin, currentRoute, onNavigate }: NavbarProps) => {
  const { mode } = useColorScheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { isLoggedIn, userProfile } = useAuthStore();
  const { currentBeatId, isAudioPlayerVisible, setIsAudioPlayerVisible, isPlaying } =
    usePlaybackStore();
  const { data: beats = [] } = useGetBeatsQuery();
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current beat info
  const currentBeat = beats.find(beat => beat.id === currentBeatId);

  // Show tooltip when cover art button appears, hide after 2 seconds
  // Only show on the visible Navbar instance to prevent duplicates
  useEffect(() => {
    if (!isAudioPlayerVisible && currentBeat && !globalTooltipShown) {
      let tooltipTimer: NodeJS.Timeout | null = null;

      // Check if this Navbar instance is actually visible
      const checkAndShow = () => {
        if (containerRef.current) {
          const styles = window.getComputedStyle(containerRef.current);
          const rect = containerRef.current.getBoundingClientRect();

          const isVisible =
            styles.display !== 'none' &&
            styles.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0;

          if (isVisible) {
            setShowTooltip(true);
            globalTooltipShown = true;
            tooltipTimer = setTimeout(() => {
              setShowTooltip(false);
            }, 2000);
          }
        }
      };

      // Small delay to ensure CSS has applied
      const timeoutId = setTimeout(checkAndShow, 100);

      return () => {
        clearTimeout(timeoutId);
        if (tooltipTimer) {
          clearTimeout(tooltipTimer);
        }
      };
    } else if (isAudioPlayerVisible || !currentBeat) {
      setShowTooltip(false);
      // Reset global flag when audio player becomes visible or beat changes
      if (isAudioPlayerVisible) {
        globalTooltipShown = false;
      }
    }
  }, [isAudioPlayerVisible, currentBeat]);

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

  if (!mode) return null;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditProfile = () => {
    setEditProfileOpen(true);
    handleMenuClose();
  };

  const handleMusicIconClick = () => {
    onNavigate?.('music-icon');
  };

  const handleLibraryIconClick = () => {
    onNavigate?.('library');
  };

  // Default to music-icon (beats page) if currentRoute is null/undefined
  const isBeatsPageActive =
    currentRoute === 'music-icon' || currentRoute === null || currentRoute === undefined;
  const isLibraryPageActive = currentRoute === 'library';

  return (
    <Box ref={containerRef} className="navbar sidebar">
      {/* Navigation icons */}
      <Box className="sidebar-nav">
        <IconButton
          className={`nav-icon ${isBeatsPageActive ? 'active' : ''}`}
          onClick={handleMusicIconClick}
          title="Beats"
        >
          <Icon
            icon={isBeatsPageActive ? 'ri:music-fill' : 'ri:music-line'}
            width={24}
            height={24}
          />
        </IconButton>
        <Tooltip title="Library coming soon" arrow placement="right">
          <span>
            <IconButton
              className={`nav-icon ${isLibraryPageActive ? 'active' : ''}`}
              onClick={handleLibraryIconClick}
              disabled
              sx={{
                opacity: 0.5,
                cursor: 'not-allowed',
                '&:hover': {
                  opacity: 0.6,
                },
              }}
            >
              <Icon
                icon={
                  isLibraryPageActive ? 'fluent:library-20-filled' : 'fluent:library-20-regular'
                }
                width={24}
                height={24}
              />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* User profile avatar button at bottom */}
      <Box className="sidebar-footer">
        {/* Show cover art when audio player is hidden and there's a current beat */}
        {!isAudioPlayerVisible && currentBeat && (
          <Tooltip
            title="Click here to show global audio player"
            open={showTooltip}
            arrow
            placement="right"
            slotProps={{
              tooltip: {
                sx: {
                  backgroundColor: '#1db954',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  padding: '8px 12px',
                  boxShadow: '0 4px 12px rgba(29, 185, 84, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '& .MuiTooltip-arrow': {
                    color: '#1db954',
                  },
                },
              },
            }}
          >
            <IconButton
              className={`nav-icon cover-art-btn ${isPlaying ? 'rotating' : ''}`}
              onClick={() => setIsAudioPlayerVisible(true)}
              title={currentBeat.name}
            >
              {currentBeat.cover_art ? (
                <img
                  src={currentBeat.cover_art}
                  alt={currentBeat.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '100px',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
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
            </IconButton>
          </Tooltip>
        )}
        {isLoggedIn ? (
          <IconButton onClick={handleMenuOpen} className="profile-btn">
            <Avatar
              className="avatar"
              alt="User Avatar"
              src={
                typeof userProfile?.avatar === 'string' && userProfile.avatar.trim() !== ''
                  ? userProfile.avatar
                  : undefined
              }
            />
          </IconButton>
        ) : (
          <IconButton
            onClick={onSignin}
            title="Sign in"
            className="nav-icon"
            sx={{
              opacity: 0.6,
              transition: 'all ease-in-out 0.2s',
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <Login />
          </IconButton>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          slotProps={{
            paper: {
              className: 'avatar-menu',
            },
          }}
        >
          {isLoggedIn && (
            <MenuItem className="avatar-menu-item" onClick={handleEditProfile}>
              <Edit className="icon" />
              <Typography>Edit profile</Typography>
            </MenuItem>
          )}

          {isLoggedIn ? (
            <MenuItem
              className="avatar-menu-item"
              onClick={() => {
                onLogout();
                handleMenuClose();
              }}
            >
              <Logout className="icon" />
              <Typography>Logout</Typography>
            </MenuItem>
          ) : (
            <MenuItem
              className="avatar-menu-item"
              onClick={() => {
                onSignin();
                handleMenuClose();
              }}
            >
              <Login className="icon" />
              <Typography>Sign in</Typography>
            </MenuItem>
          )}
        </Menu>
      </Box>

      <EditProfile open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </Box>
  );
};

export default Navbar;
