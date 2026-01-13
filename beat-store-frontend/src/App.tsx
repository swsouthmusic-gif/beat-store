import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from '@/theme/theme';

import type { BeatType } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';

import Layout from '@/components/Layout';
import AudioPlayer from '@/components/AudioPlayer';
import BeatsPage from '@/pages/BeatsPage';
import LibraryPage from '@/pages/LibraryPage';
import GlobalSnackbar from '@/components/GlobalSnackbar';

type Route = 'music-icon' | 'library' | null;

function App() {
  const [selectedBeat, setSelectedBeat] = useState<BeatType | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route>('music-icon'); // Default to beats page
  const { rehydrate } = useAuthStore();

  // Rehydrate auth state on app start
  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  const handleSelectBeat = (beat: BeatType) => {
    setSelectedBeat(beat);
  };

  const handleCloseDrawer = () => {
    setSelectedBeat(null);
  };

  const handleNavigate = (route: Route) => {
    setCurrentRoute(route);
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ThemeProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        {/* <Box
          sx={{
            padding: '20px 12px 0 12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: "'Lion King', sans-serif",
              fontSize: '14px',
              fontWeight: 300,
              letterSpacing: '32px',
              opacity: 0.6,
            }}
          >
            SMALL WRLD SOUTH MG
          </Typography>
        </Box> */}
        <Layout currentRoute={currentRoute} onNavigate={handleNavigate}>
          {currentRoute === 'music-icon' && (
          <BeatsPage
            selectedBeat={selectedBeat}
            setSelectedBeat={handleCloseDrawer}
            onSelectBeat={handleSelectBeat}
          />
          )}
          {currentRoute === 'library' && <LibraryPage />}
        </Layout>
        <AudioPlayer onDownloadClick={handleSelectBeat} />
        <GlobalSnackbar />
      </ThemeProvider>
    </Box>
  );
}

export default App;
