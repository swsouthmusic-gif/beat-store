import { Box, IconButton } from '@mui/material';
import { ViewList, ViewModule } from '@mui/icons-material';

import '@/components/Style/beatheaderbar.scss';

interface BeatsHeaderBarProps {
  currentView: 'list' | 'grid';
  onToggleView: () => void;
}

const BeatsHeaderBar = ({ currentView, onToggleView }: BeatsHeaderBarProps) => {
  return (
    <Box className="beats-header">
      <Box className="view-toggle">
        <IconButton className="view-btn" onClick={onToggleView}>
          {currentView === 'list' ? <ViewModule /> : <ViewList />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default BeatsHeaderBar;
