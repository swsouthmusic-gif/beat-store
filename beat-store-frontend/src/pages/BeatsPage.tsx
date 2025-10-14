import { useState, useEffect } from 'react';

import { Box } from '@mui/material';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

import type { BeatType } from '@/store/beatApi';
import { useGetBeatsQuery } from '@/store/beatApi';

import BeatsHeaderBar from '@/components/BeatsHeaderBar';
import BeatRow from '@/components/BeatRow';
import BeatCard from '@/components/BeatCard';
import BeatGrid from '@/components/BeatGrid';
import BeatFilters from '@/components/BeatFilters';
import BeatDrawer from '@/components/BeatDrawer';

import '@/pages/Styles/beatspage.scss';

type BeatFiltersType = {
  genre: string[];
  bpm: [number, number];
  scaleType: string;
  notes: string[];
};

type AuthMode = 'login' | 'forgot' | 'signup';

interface BeatsPageProps {
  selectedBeat: BeatType | null;
  setSelectedBeat: (beat: BeatType | null) => void;
  onSelectBeat: (beat: BeatType) => void;
  onRequestAuth?: (mode: AuthMode) => void;
}

const BeatsPage = ({
  selectedBeat,
  setSelectedBeat,
  onSelectBeat,
  onRequestAuth,
}: Omit<BeatsPageProps, 'beats'>) => {
  const { data: beats = [], isLoading, isError, error } = useGetBeatsQuery();

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

  if (isLoading) return <div>Loading beats...</div>;
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

  return (
    <Box sx={{ px: 3, py: 2, maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto' }}>
      <BeatsHeaderBar
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

      <Box className="beats-container">
        <BeatFilters
          filters={filters}
          setFilters={setFilters}
          genres={uniqueGenres}
          minBpm={minBpm}
          maxBpm={maxBpm}
          scaleTypes={scaleTypes}
          notes={rootNotes}
        />
        <>
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
                maxWidth={isVerySmallScreen ? '300px' : '100%'}
                margin={isVerySmallScreen ? '0 auto' : '0'}
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
        </>
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
