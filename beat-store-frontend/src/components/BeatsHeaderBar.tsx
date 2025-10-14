import { useState } from 'react';

import { Box, IconButton, Menu, MenuItem, Button } from '@mui/material';
import { ViewList, ViewModule, Sort, ArrowDownward, ArrowUpward } from '@mui/icons-material';

import '@/components/Style/beatheaderbar.scss';

interface BeatsHeaderBarProps {
  currentView: 'list' | 'grid';
  onToggleView: () => void;
  currentSort: string;
  currentDirection: 'asc' | 'desc';
  onSortChange: (sortKey: string) => void;
}

const sortOptions = ['Name', 'Genre', 'BPM', 'Scale'];

const BeatsHeaderBar = ({
  currentView,
  onToggleView,
  currentSort,
  currentDirection,
  onSortChange,
}: BeatsHeaderBarProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenSortMenu = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleCloseSortMenu = () => {
    setAnchorEl(null);
  };

  const handleSelectSort = (option: string) => {
    onSortChange(option);
    handleCloseSortMenu();
  };

  return (
    <Box className="beats-header">
      <Box className="sort-toggle">
        <Button
          className={`sort-btn ${Boolean(anchorEl) ? 'menu-open' : ''}`}
          startIcon={<Sort />}
          onClick={handleOpenSortMenu}
          size="small"
          endIcon={
            currentDirection === 'desc' ? (
              <ArrowDownward className="sort-arrow" />
            ) : (
              <ArrowUpward className="sort-arrow" />
            )
          }
        >
          Sort by {currentSort}
        </Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseSortMenu}>
          {sortOptions.map(option => (
            <MenuItem
              key={option}
              selected={option === currentSort}
              onClick={() => handleSelectSort(option)}
            >
              {option}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Box className="view-toggle">
        <IconButton className="view-btn" onClick={onToggleView}>
          {currentView === 'list' ? <ViewModule /> : <ViewList />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default BeatsHeaderBar;
