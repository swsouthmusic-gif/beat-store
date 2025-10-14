import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from '@/theme/theme';

import type { BeatType } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';

import Layout from '@/components/Layout';
import AudioPlayer from '@/components/AudioPlayer';
import BeatsPage from '@/pages/BeatsPage';
import GlobalSnackbar from '@/components/GlobalSnackbar';

function App() {
  const [selectedBeat, setSelectedBeat] = useState<BeatType | null>(null);
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

  return (
    <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline />
        <Layout>
          <BeatsPage
            selectedBeat={selectedBeat}
            setSelectedBeat={handleCloseDrawer}
            onSelectBeat={handleSelectBeat}
          />
        </Layout>
        <AudioPlayer onDownloadClick={handleSelectBeat} />
        <GlobalSnackbar />
      </ThemeProvider>
    </Box>
  );
}

export default App;
