import { useState, useEffect } from 'react';

import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { keyframes } from '@mui/system';

import type { BeatType } from '@/store/beatApi';
import { useGetBeatsQuery } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';

import BeatRow from '@/components/BeatRow';
import BeatCard from '@/components/BeatCard';
import BeatGrid from '@/components/BeatGrid';
import BeatFilters from '@/components/BeatFilters';
import BeatDrawer from '@/components/BeatDrawer';
import Navbar from '@/components/Navbar';

import '@/pages/Styles/beatspage.scss';

type BeatFiltersType = {
  genre: string[];
  bpm: [number, number];
  scaleType: string;
  notes: string[];
};

type AuthMode = 'login' | 'forgot' | 'signup';
type Route = 'music-icon' | 'library' | null;

// Animated music note loading component
const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
`;

const MusicNoteLoader = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Animated music note SVG */}
        <motion.svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
          }}
        >
          {/* Music note - filled oval note head with stem */}
          <defs>
            <linearGradient id="noteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor="var(--beat-palette-primary-main, #ffc300)"
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor="var(--beat-palette-primary-main, #ffc300)"
                stopOpacity="1"
              />
            </linearGradient>
          </defs>

          {/* Note head (oval) - fills from center */}
          <motion.ellipse
            cx="50"
            cy="70"
            rx="15"
            ry="10"
            fill="var(--beat-palette-primary-main, #ffc300)"
            initial={{ fillOpacity: 0, scale: 0.3 }}
            animate={{
              fillOpacity: [0, 0.4, 0.8, 1, 0.8, 0.4, 0],
              scale: [0.3, 0.6, 0.9, 1, 1.1, 1, 0.9],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Stem - fills from top to bottom */}
          <motion.rect
            x="62"
            y="30"
            width="3"
            height="45"
            fill="var(--beat-palette-primary-main, #ffc300)"
            initial={{ fillOpacity: 0 }}
            animate={{
              fillOpacity: [0, 0, 0.3, 0.6, 1, 0.6, 0.3, 0],
              scaleY: [0, 0, 0.3, 0.6, 1, 0.6, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.2,
            }}
            style={{ transformOrigin: 'top center' }}
          />

          {/* Flag - draws in */}
          <motion.path
            d="M65 30 Q75 25, 80 30 Q75 35, 65 30"
            fill="var(--beat-palette-primary-main, #ffc300)"
            stroke="none"
            initial={{ fillOpacity: 0, pathLength: 0 }}
            animate={{
              fillOpacity: [0, 0, 0, 0.4, 0.8, 1, 0.8, 0.4, 0],
              pathLength: [0, 0, 0, 0.3, 0.6, 1, 0.6, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
          />
        </motion.svg>

        {/* Pulsing ring */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'primary.main',
            opacity: 0.3,
            animation: `${pulseAnimation} 2s ease-in-out infinite`,
          }}
        />
      </Box>
    </Box>
  );
};

interface BeatsPageProps {
  selectedBeat: BeatType | null;
  setSelectedBeat: (beat: BeatType | null) => void;
  onSelectBeat: (beat: BeatType) => void;
  onRequestAuth?: (mode: AuthMode) => void;
  currentRoute?: Route;
  onNavigate?: (route: Route) => void;
}

const BeatsPage = ({
  selectedBeat,
  setSelectedBeat,
  onSelectBeat,
  onRequestAuth,
  currentRoute,
  onNavigate,
}: Omit<BeatsPageProps, 'beats'>) => {
  const { data: beats = [], isLoading, isError, error } = useGetBeatsQuery();
  const { logout } = useAuthStore();

  const rootNotes = Array.from(new Set(beats.map(b => b.scale.split(' ')[0]).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );

  const uniqueGenres = Array.from(new Set(beats.map(b => b.genre)));
  const bpmValues = beats.map(b => b.bpm);
  const minBpm = bpmValues.length > 0 ? Math.min(...bpmValues) : 60;
  const maxBpm = bpmValues.length > 0 ? Math.max(...bpmValues) : 200;
  const scaleTypes = Array.from(
    new Set(beats.map(b => b.scale.split(' ')[1]).filter(Boolean)),
  ).filter(s => ['Major', 'Minor'].includes(s));

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'Name',
    direction: 'asc',
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedDownloadTypes, setSelectedDownloadTypes] = useState<
    Record<number, 'mp3' | 'wav' | 'stems' | null>
  >({});
  const [filters, setFilters] = useState<BeatFiltersType>({
    genre: [],
    bpm: [60, 200],
    scaleType: '',
    notes: [],
  });

  // Responsive behavior for small screens
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isVerySmallScreen, setIsVerySmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsSmallScreen(width <= 768); // iPad and smaller
      setIsVerySmallScreen(width <= 424); // Very small screens
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
        }}
      >
        <MusicNoteLoader />
      </Box>
    );
  }
  if (isError) {
    console.error('Beats API Error:', error);
    return (
      <div>
        <div>Failed to load beats</div>
        <div>Error: {JSON.stringify(error)}</div>
      </div>
    );
  }

  const filteredBeats = beats.filter(beat => {
    const genreMatch = filters.genre.length === 0 || filters.genre.includes(beat.genre);
    const bpmMatch = beat.bpm >= filters.bpm[0] && beat.bpm <= filters.bpm[1];
    const [note, type] = beat.scale.split(' ');
    const scaleTypeMatch =
      !filters.scaleType || type.toLowerCase() === filters.scaleType.toLowerCase();
    const noteMatch = filters.notes.length === 0 || filters.notes.includes(note);

    return genreMatch && bpmMatch && scaleTypeMatch && noteMatch;
  });

  const sortedBeats = [...filteredBeats].sort((a, b) => {
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;

    switch (key) {
      case 'Name':
        return a.name.localeCompare(b.name) * dir;
      case 'Genre':
        return a.genre.localeCompare(b.genre) * dir;
      case 'BPM':
        return (a.bpm - b.bpm) * dir;
      case 'Scale':
        return a.scale.localeCompare(b.scale) * dir;
      default:
        return 0;
    }
  });

  const handleSelectBeat = (beat: BeatType) => {
    setSelectedDownloadTypes(prev => ({
      ...prev,
      [beat.id]: null,
    }));
    onSelectBeat(beat);
  };

  const handleLogout = () => logout();
  const handleSignin = () => {
    if (onRequestAuth) {
      onRequestAuth('login');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {isSmallScreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            px: 2,
            pt: 2,
            pb: 1,
            backgroundColor: 'rgba(var(--beat-palette-background-defaultChannel) / 0.6)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
          }}
        >
          <Navbar
            onLogout={handleLogout}
            onSignin={handleSignin}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
          />
        </Box>
      )}
      <Box
        className="beats-container"
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 3,
          pt: isSmallScreen ? '140px' : '100px',
          pb: 2,
          mt: isSmallScreen ? '24px' : 0,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: isSmallScreen ? '80px' : 0,
            left: isSmallScreen ? '0px' : '104px',
            right: isSmallScreen ? '0px' : '24px',
            width: isSmallScreen ? '100%' : 'calc(100% - 128px)',
            zIndex: 1000,
            pt: isSmallScreen ? 1 : 2,
            pb: 1,
            marginTop: isSmallScreen ? '0' : '20px',
          }}
        >
          <BeatFilters
            filters={filters}
            setFilters={setFilters}
            genres={uniqueGenres}
            minBpm={minBpm}
            maxBpm={maxBpm}
            scaleTypes={scaleTypes}
            notes={rootNotes}
            currentSort={sortConfig.key}
            currentDirection={sortConfig.direction}
            onSortChange={newKey => {
              setSortConfig(prev => {
                const isSameKey = prev.key === newKey;
                return {
                  key: newKey,
                  direction: isSameKey && prev.direction === 'asc' ? 'desc' : 'asc',
                };
              });
            }}
            currentView={viewMode}
            onToggleView={() => setViewMode(prev => (prev === 'list' ? 'grid' : 'list'))}
          />
        </Box>
        <Box sx={{ paddingBottom: '60px' }}>
          {/* LIST view with animation - use BeatCard on small screens, BeatRow on larger screens */}
          <Box
            sx={{
              display: viewMode === 'list' ? 'flex' : 'none',
              flexDirection: 'column',
            }}
          >
            {isSmallScreen ? (
              // Small screens: Use BeatCard in grid layout
              <Box
                display="grid"
                gridTemplateColumns={
                  isVerySmallScreen ? '1fr' : 'repeat(auto-fill, minmax(180px, 1fr))'
                }
                gap={2}
                justifyContent={isVerySmallScreen ? 'center' : 'stretch'}
              >
                <LayoutGroup>
                  <AnimatePresence mode="sync">
                    {sortedBeats.map(beat => (
                      <motion.div
                        key={beat.id}
                        layout
                        initial={{ opacity: 0, y: 0, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.99 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                      >
                        <BeatCard key={beat.id} {...beat} onClick={() => handleSelectBeat(beat)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </LayoutGroup>
              </Box>
            ) : (
              // Larger screens: Use BeatRow in list layout
              <LayoutGroup>
                <AnimatePresence mode="sync">
                  {sortedBeats.map(beat => (
                    <motion.div
                      key={beat.id}
                      layout
                      initial={{ opacity: 0, y: 0, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.99 }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    >
                      <BeatRow key={beat.id} {...beat} onClick={() => handleSelectBeat(beat)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </LayoutGroup>
            )}
          </Box>

          {/* GRID view (no animation, stays mounted) */}
          <Box sx={{ display: viewMode === 'grid' ? 'block' : 'none' }}>
            <BeatGrid beats={sortedBeats} onSelect={handleSelectBeat} />
          </Box>
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: '12px',
              color: 'text.primary',
              py: 2,
              zIndex: 100,
              backgroundColor: 'rgba(var(--beat-palette-background-defaultChannel) / 0.5)',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Typography variant="body2" color="text.primary" sx={{ opacity: '.5' }}>
              Small World South MG
            </Typography>
          </Box>
        </Box>
      </Box>
      <BeatDrawer
        open={Boolean(selectedBeat)}
        beat={selectedBeat}
        onClose={() => setSelectedBeat(null)}
        selectedDownloadType={selectedDownloadTypes[selectedBeat?.id ?? -1] ?? null}
        setSelectedDownloadType={type => {
          if (selectedBeat) {
            setSelectedDownloadTypes(prev => ({ ...prev, [selectedBeat.id]: type }));
          }
        }}
        onRequestAuth={onRequestAuth}
      />
    </Box>
  );
};

export default BeatsPage;
