import { useState } from 'react';

import { Box, Typography } from '@mui/material';
import CopyrightIcon from '@mui/icons-material/Copyright';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

import type { BeatType } from '@/store/beatApi';
import { useGetBeatsQuery } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';
import { useResponsive } from '@/hooks/useResponsive';

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
  const { data: beats = [], isError, error } = useGetBeatsQuery();
  const { logout } = useAuthStore();

  const rootNotes = Array.from(new Set(beats.map(b => b.scale.split(' ')[0]).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );

  const uniqueGenres = Array.from(new Set(beats.map(b => b.genre)));
  const bpmValues = beats.map(b => b.bpm);
  const minBpm = bpmValues.length > 0 ? Math.min(...bpmValues) : 60;
  const maxBpm = bpmValues.length > 0 ? Math.max(...bpmValues) : 200;
  // Extract scale types case-insensitively and normalize to "Major" and "Minor" for display
  const scaleTypes: string[] = [];
  const seenTypes = new Set<string>();
  for (const beat of beats) {
    const scalePart = beat.scale.split(' ')[1];
    if (!scalePart) continue;
    const lower = scalePart.toLowerCase();
    if (lower === 'major' && !seenTypes.has('Major')) {
      scaleTypes.push('Major');
      seenTypes.add('Major');
    } else if (lower === 'minor' && !seenTypes.has('Minor')) {
      scaleTypes.push('Minor');
      seenTypes.add('Minor');
    }
  }

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
  const { isSmallScreen, isVerySmallScreen } = useResponsive();

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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
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
            <CopyrightIcon sx={{ fontSize: '16px', opacity: '.4' }} />
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ opacity: '.4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
            >
              2026 Small World South Music Group
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
