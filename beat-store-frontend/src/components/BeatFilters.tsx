import { useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  Slider,
  Popover,
  Checkbox,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Modal,
  Backdrop,
  Fade,
} from '@mui/material';
import {
  Cancel,
  TuneRounded,
  Sort,
  ArrowDownward,
  ArrowUpward,
  ViewList,
  ViewModule,
  Close,
  ArrowBackRounded,
} from '@mui/icons-material';
import { useResponsive } from '@/hooks/useResponsive';
import '@/components/Style/beatheaderbar.scss';

export type BeatFiltersType = {
  genre: string[];
  bpm: [number, number];
  scaleType: string;
  notes: string[];
};

const sortOptions = ['Name', 'Genre', 'BPM', 'Scale'];

interface BeatFiltersProps {
  filters: BeatFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<BeatFiltersType>>;
  genres: string[];
  minBpm: number;
  maxBpm: number;
  scaleTypes: string[];
  notes: string[];
  currentSort: string;
  currentDirection: 'asc' | 'desc';
  onSortChange: (sortKey: string) => void;
  currentView: 'list' | 'grid';
  onToggleView: () => void;
}

const BeatFilters = ({
  filters,
  setFilters,
  genres,
  minBpm,
  maxBpm,
  scaleTypes,
  notes,
  currentSort,
  currentDirection,
  onSortChange,
  currentView,
  onToggleView,
}: BeatFiltersProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const { isSmallScreen, isVerySmallScreen } = useResponsive();
  const [filtersPopoverAnchor, setFiltersPopoverAnchor] = useState<null | HTMLElement>(null);
  const [activeFilterInModal, setActiveFilterInModal] = useState<string | null>(null);

  const [tempFilters, setTempFilters] = useState<BeatFiltersType>(filters);

  const handleOpen = (event: React.MouseEvent<HTMLElement>, filter: string) => {
    if (isVerySmallScreen && filtersPopoverOpen) {
      // On very small screens, show filter selection in modal instead of popover
      setActiveFilterInModal(filter);
      setTempFilters(filters);
    } else {
      setAnchorEl(event.currentTarget);
      setActiveFilter(filter);
      setTempFilters(filters);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveFilter(null);
  };

  const handleApply = () => {
    setFilters(tempFilters);
    handleClose();
  };

  const clearFilter = (key: keyof BeatFiltersType) => {
    setFilters(prev => {
      const cleared = { ...prev };
      if (key === 'bpm') cleared.bpm = [60, 200];
      else if (key === 'genre' || key === 'notes') cleared[key] = [];
      else if (key === 'scaleType') cleared.scaleType = '';
      return cleared;
    });
  };

  const handleOpenSortMenu = (e: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(e.currentTarget);
  };

  const handleCloseSortMenu = () => {
    setSortAnchorEl(null);
  };

  const handleSelectSort = (option: string) => {
    onSortChange(option);
    handleCloseSortMenu();
  };

  const open = Boolean(anchorEl);
  const sortMenuOpen = Boolean(sortAnchorEl);
  const filtersPopoverOpen = Boolean(filtersPopoverAnchor);

  const hasActiveFilters =
    filters.genre.length > 0 ||
    filters.bpm[0] !== 60 ||
    filters.bpm[1] !== 200 ||
    Boolean(filters.scaleType) ||
    filters.notes.length > 0;

  const handleOpenFiltersPopover = (event: React.MouseEvent<HTMLElement>) => {
    setFiltersPopoverAnchor(event.currentTarget);
  };

  const handleCloseFiltersPopover = () => {
    setFiltersPopoverAnchor(null);
    setActiveFilterInModal(null);
  };

  const handleApplyInModal = () => {
    setFilters(tempFilters);
    setActiveFilterInModal(null);
  };

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        sx={{
          width: '100%',
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          sx={{
            backgroundColor: 'rgba(30, 30, 30, .6)',
            backdropFilter: 'blur(10px)',
            boxShadow: '1px 4px 20px rgba(0,0,0,0.24)',
            borderRadius: '100px',
            padding: '8px 8px 8px 16px',
            marginLeft: isSmallScreen ? 'auto' : '0',
            marginRight: isSmallScreen ? 'auto' : '0',
            transition: 'all 0.3s ease',
          }}
        >
          <IconButton
            onClick={isVerySmallScreen ? handleOpenFiltersPopover : undefined}
            size="small"
            sx={{
              padding: '4px',
              color: isVerySmallScreen
                ? 'var(--beat-palette-primary-main)'
                : 'var(--beat-palette-text-secondary)',
              backgroundColor:
                isVerySmallScreen && hasActiveFilters
                  ? 'rgba(var(--beat-palette-primary-mainChannel) / 0.2)'
                  : 'transparent',
              '&:hover': {
                backgroundColor: !isVerySmallScreen
                  ? 'transparent'
                  : isVerySmallScreen && hasActiveFilters
                    ? 'rgba(var(--beat-palette-primary-mainChannel) / 0.3)'
                    : 'rgba(var(--beat-palette-primary-mainChannel) / 0.1)',
              },
              transition: 'all 0.2s ease-in-out',
              cursor: isVerySmallScreen ? 'pointer' : 'default',
            }}
          >
            <TuneRounded fontSize="small" />
          </IconButton>
          {!isVerySmallScreen && (
            <>
              <Chip
                label="Genre"
                onClick={e => handleOpen(e, 'genre')}
                variant={filters.genre.length > 0 ? 'filled' : 'outlined'}
                color={filters.genre.length > 0 ? 'primary' : 'default'}
                deleteIcon={filters.genre.length > 0 ? <Cancel /> : undefined}
                onDelete={filters.genre.length > 0 ? () => clearFilter('genre') : undefined}
              />

              <Chip
                label="BPM"
                onClick={e => handleOpen(e, 'bpm')}
                variant={filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? 'filled' : 'outlined'}
                color={filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? 'primary' : 'default'}
                deleteIcon={
                  filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? <Cancel /> : undefined
                }
                onDelete={
                  filters.bpm[0] !== 60 || filters.bpm[1] !== 200
                    ? () => clearFilter('bpm')
                    : undefined
                }
              />

              <Chip
                label="Scale"
                onClick={e => handleOpen(e, 'scale')}
                variant={filters.scaleType || filters.notes.length > 0 ? 'filled' : 'outlined'}
                color={filters.scaleType || filters.notes.length > 0 ? 'primary' : 'default'}
                deleteIcon={filters.scaleType || filters.notes.length > 0 ? <Cancel /> : undefined}
                onDelete={
                  filters.scaleType || filters.notes.length > 0
                    ? () => {
                        clearFilter('scaleType');
                        clearFilter('notes');
                      }
                    : undefined
                }
              />
            </>
          )}

          <Button
            className={`sort-btn ${sortMenuOpen ? 'menu-open' : ''}`}
            startIcon={<Sort />}
            onClick={handleOpenSortMenu}
            size="small"
            endIcon={
              !isSmallScreen ? (
                currentDirection === 'desc' ? (
                  <ArrowDownward className="sort-arrow" />
                ) : (
                  <ArrowUpward className="sort-arrow" />
                )
              ) : null
            }
            sx={{
              textTransform: 'capitalize',
              borderRadius: '100px',
              color: 'var(--beat-palette-text-primary)',
              padding: '8px 12px',
              '&:hover, &.menu-open': {
                backgroundColor:
                  'rgba(var(--beat-palette-action-activeChannel) / var(--beat-palette-action-hoverOpacity))',
              },
              '& .sort-arrow': {
                opacity: 0.7,
                marginTop: '-2px',
              },
              '& .MuiButton-startIcon': {
                marginRight: isSmallScreen ? 0 : '8px',
              },
            }}
          >
            {!isSmallScreen && `Sort by ${currentSort}`}
          </Button>
          <Menu anchorEl={sortAnchorEl} open={sortMenuOpen} onClose={handleCloseSortMenu}>
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

        {!isSmallScreen && (
          <Box
            className="view-toggle"
            sx={{
              backgroundColor: 'rgba(30, 30, 30, .6)',
              backdropFilter: 'blur(8px)',
              boxShadow: '1px 4px 20px rgba(0,0,0,0.24)',
              borderRadius: '100px',
              padding: '8px',
              transition: 'all 0.3s ease',
            }}
          >
            <IconButton className="view-btn" onClick={onToggleView}>
              {currentView === 'list' ? <ViewModule /> : <ViewList />}
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Filter Selection Popover - Only on non-very small screens */}
      {!isVerySmallScreen && (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '12px',
                backgroundColor: 'rgba(var(--beat-palette-background-defaultChannel) / 0.6)',
                backgroundImage: 'var(--beat-overlays-1)',
                backdropFilter: 'blur(10px)',
                boxShadow: '1px 4px 12px rgba(0,0,0,0.3)',
                mt: 0.5,
              },
            },
          }}
        >
          {open && (
            <Box p="20px" minWidth={260}>
              {activeFilter === 'genre' && (
                <Box>
                  <Typography fontSize="14px" gutterBottom>
                    Genres
                  </Typography>
                  {genres.map(g => (
                    <Box key={g} display="flex" alignItems="center">
                      <Checkbox
                        checked={tempFilters.genre.includes(g)}
                        onChange={e => {
                          setTempFilters(prev => {
                            const genreSet = new Set(prev.genre);
                            if (e.target.checked) genreSet.add(g);
                            else genreSet.delete(g);
                            return { ...prev, genre: Array.from(genreSet) };
                          });
                        }}
                      />
                      <Typography variant="body2">{g}</Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {activeFilter === 'bpm' && (
                <Box>
                  <Typography fontSize="14px" gutterBottom>
                    BPM Range
                  </Typography>
                  <Slider
                    value={tempFilters.bpm}
                    onChange={(_, newValue) =>
                      setTempFilters(prev => ({ ...prev, bpm: newValue as [number, number] }))
                    }
                    valueLabelDisplay="auto"
                    min={minBpm}
                    max={maxBpm}
                  />
                </Box>
              )}

              {activeFilter === 'scale' && (
                <Box>
                  <Typography fontSize="14px" gutterBottom>
                    Scale
                  </Typography>
                  <Box display="flex" justifyContent="left" gap={1} mb={2}>
                    {scaleTypes.map(s => (
                      <Chip
                        key={s}
                        label={s}
                        variant={tempFilters.scaleType === s ? 'filled' : 'outlined'}
                        color={tempFilters.scaleType === s ? 'primary' : 'default'}
                        onClick={() =>
                          setTempFilters(prev => ({ ...prev, scaleType: s, notes: [] }))
                        }
                      />
                    ))}
                  </Box>

                  <Box>
                    <Typography fontSize="14px" gutterBottom>
                      Notes
                    </Typography>
                    <Box sx={{ maxHeight: '280px', overflow: 'scroll' }}>
                      {notes.map(n => {
                        const isDisabled = !tempFilters.scaleType;
                        return (
                          <Box key={n} display="flex" alignItems="center">
                            <Checkbox
                              disabled={isDisabled}
                              checked={tempFilters.notes.includes(n)}
                              onChange={e => {
                                setTempFilters(prev => {
                                  const noteSet = new Set(prev.notes);
                                  if (e.target.checked) noteSet.add(n);
                                  else noteSet.delete(n);
                                  return { ...prev, notes: Array.from(noteSet) };
                                });
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                color: isDisabled ? 'text.disabled' : 'text.primary',
                              }}
                            >
                              {n}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              )}

              <Box display="flex" marginTop="20px" justifyContent="space-between">
                <Chip
                  label="Clear"
                  onClick={() =>
                    setTempFilters({ genre: [], bpm: [60, 200], scaleType: '', notes: [] })
                  }
                />
                <Chip color="primary" label="Apply" onClick={handleApply} />
              </Box>
            </Box>
          )}
        </Popover>
      )}

      {/* Filters Drawer for Very Small Screens */}
      <Modal
        open={filtersPopoverOpen && isVerySmallScreen}
        onClose={handleCloseFiltersPopover}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 300,
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          },
        }}
        sx={{
          display: isVerySmallScreen ? 'flex' : 'none',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          pt: 2,
          pr: 0,
        }}
      >
        <Fade in={filtersPopoverOpen && isVerySmallScreen}>
          <Box
            sx={{
              width: '100%',
              maxWidth: '100vw',
              height: '100vh',
              maxHeight: '100vh',
              backgroundColor: 'rgba(var(--beat-palette-background-defaultChannel) / 0.95)',
              backgroundImage: 'var(--beat-overlays-1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0px 4px 20px rgba(0,0,0,0.5)',
              borderRadius: '0',
              p: 3,
              outline: 'none',
              transform: filtersPopoverOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s ease-in-out',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Box
              display="flex"
              width="100%"
              justifyContent="space-between"
              alignItems="center"
              pb={2}
              sx={{
                flexShrink: 0,
              }}
            >
              <Typography fontSize="16px" fontWeight={500}>
                Filters
              </Typography>
              <IconButton
                onClick={handleCloseFiltersPopover}
                sx={{
                  color: 'var(--beat-palette-text-primary)',
                  zIndex: 1,
                }}
              >
                <Close />
              </IconButton>
            </Box>
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                minHeight: 0,
              }}
            >
              {!activeFilterInModal ? (
                <Box display="flex" flexDirection="column" gap={1.5}>
                  <Chip
                    label="Genre"
                    onClick={e => {
                      handleOpen(e, 'genre');
                    }}
                    variant={filters.genre.length > 0 ? 'filled' : 'outlined'}
                    color={filters.genre.length > 0 ? 'primary' : 'default'}
                    deleteIcon={filters.genre.length > 0 ? <Cancel /> : undefined}
                    onDelete={e => {
                      e.stopPropagation();
                      clearFilter('genre');
                    }}
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />

                  <Chip
                    label="BPM"
                    onClick={e => {
                      handleOpen(e, 'bpm');
                    }}
                    variant={
                      filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? 'filled' : 'outlined'
                    }
                    color={filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? 'primary' : 'default'}
                    deleteIcon={
                      filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? <Cancel /> : undefined
                    }
                    onDelete={e => {
                      e.stopPropagation();
                      clearFilter('bpm');
                    }}
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />

                  <Chip
                    label="Scale"
                    onClick={e => {
                      handleOpen(e, 'scale');
                    }}
                    variant={filters.scaleType || filters.notes.length > 0 ? 'filled' : 'outlined'}
                    color={filters.scaleType || filters.notes.length > 0 ? 'primary' : 'default'}
                    deleteIcon={
                      filters.scaleType || filters.notes.length > 0 ? <Cancel /> : undefined
                    }
                    onDelete={e => {
                      e.stopPropagation();
                      clearFilter('scaleType');
                      clearFilter('notes');
                    }}
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />
                </Box>
              ) : (
                <Box>
                  <Box
                    display="flex"
                    width="100%"
                    justifyContent="space-between"
                    alignItems="center"
                    pb={2}
                  >
                    <IconButton
                      onClick={() => setActiveFilterInModal(null)}
                      sx={{
                        color: 'var(--beat-palette-text-primary)',
                      }}
                    >
                      <ArrowBackRounded />
                    </IconButton>
                    <Typography fontSize="16px" fontWeight={500}>
                      {activeFilterInModal === 'genre'
                        ? 'Genres'
                        : activeFilterInModal === 'bpm'
                          ? 'BPM Range'
                          : 'Scale'}
                    </Typography>
                    <Box width={40} /> {/* Spacer for centering */}
                  </Box>

                  {activeFilterInModal === 'genre' && (
                    <Box>
                      {genres.map(g => (
                        <Box key={g} display="flex" alignItems="center" mb={1}>
                          <Checkbox
                            checked={tempFilters.genre.includes(g)}
                            onChange={e => {
                              setTempFilters(prev => {
                                const genreSet = new Set(prev.genre);
                                if (e.target.checked) genreSet.add(g);
                                else genreSet.delete(g);
                                return { ...prev, genre: Array.from(genreSet) };
                              });
                            }}
                          />
                          <Typography variant="body2">{g}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {activeFilterInModal === 'bpm' && (
                    <Box>
                      <Slider
                        value={tempFilters.bpm}
                        onChange={(_, newValue) =>
                          setTempFilters(prev => ({ ...prev, bpm: newValue as [number, number] }))
                        }
                        valueLabelDisplay="auto"
                        min={minBpm}
                        max={maxBpm}
                      />
                    </Box>
                  )}

                  {activeFilterInModal === 'scale' && (
                    <Box>
                      <Box display="flex" justifyContent="left" gap={1} mb={2} flexWrap="wrap">
                        {scaleTypes.map(s => (
                          <Chip
                            key={s}
                            label={s}
                            variant={tempFilters.scaleType === s ? 'filled' : 'outlined'}
                            color={tempFilters.scaleType === s ? 'primary' : 'default'}
                            onClick={() =>
                              setTempFilters(prev => ({ ...prev, scaleType: s, notes: [] }))
                            }
                          />
                        ))}
                      </Box>

                      <Box>
                        <Typography fontSize="14px" gutterBottom>
                          Notes
                        </Typography>
                        <Box sx={{ maxHeight: '280px', overflow: 'scroll' }}>
                          {notes.map(n => {
                            const isDisabled = !tempFilters.scaleType;
                            return (
                              <Box key={n} display="flex" alignItems="center" mb={1}>
                                <Checkbox
                                  disabled={isDisabled}
                                  checked={tempFilters.notes.includes(n)}
                                  onChange={e => {
                                    setTempFilters(prev => {
                                      const noteSet = new Set(prev.notes);
                                      if (e.target.checked) noteSet.add(n);
                                      else noteSet.delete(n);
                                      return { ...prev, notes: Array.from(noteSet) };
                                    });
                                  }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isDisabled ? 'text.disabled' : 'text.primary',
                                  }}
                                >
                                  {n}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>
                  )}

                  <Box display="flex" marginTop="20px" justifyContent="space-between" gap={2}>
                    <Chip
                      label="Clear"
                      onClick={() =>
                        setTempFilters({ genre: [], bpm: [60, 200], scaleType: '', notes: [] })
                      }
                      sx={{ flex: 1 }}
                    />
                    <Chip
                      color="primary"
                      label="Apply"
                      onClick={handleApplyInModal}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Filters Popover for Non-Very Small Screens (fallback) */}
      {!isVerySmallScreen && (
        <Popover
          open={filtersPopoverOpen}
          anchorEl={filtersPopoverAnchor}
          onClose={handleCloseFiltersPopover}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '12px',
                backgroundColor: 'rgba(var(--beat-palette-background-defaultChannel) / 0.6)',
                backgroundImage: 'var(--beat-overlays-1)',
                backdropFilter: 'blur(10px)',
                boxShadow: '1px 4px 12px rgba(0,0,0,0.3)',
                mt: 0.5,
                p: 2,
              },
            },
          }}
        >
          <Box display="flex" flexDirection="column" gap={1.5}>
            <Chip
              label="Genre"
              onClick={e => {
                handleOpen(e, 'genre');
                handleCloseFiltersPopover();
              }}
              variant={filters.genre.length > 0 ? 'filled' : 'outlined'}
              color={filters.genre.length > 0 ? 'primary' : 'default'}
              deleteIcon={filters.genre.length > 0 ? <Cancel /> : undefined}
              onDelete={e => {
                e.stopPropagation();
                clearFilter('genre');
              }}
              sx={{ width: '100%', justifyContent: 'space-between' }}
            />

            <Chip
              label="BPM"
              onClick={e => {
                handleOpen(e, 'bpm');
                handleCloseFiltersPopover();
              }}
              variant={filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? 'filled' : 'outlined'}
              color={filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? 'primary' : 'default'}
              deleteIcon={filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? <Cancel /> : undefined}
              onDelete={e => {
                e.stopPropagation();
                clearFilter('bpm');
              }}
              sx={{ width: '100%', justifyContent: 'space-between' }}
            />

            <Chip
              label="Scale"
              onClick={e => {
                handleOpen(e, 'scale');
                handleCloseFiltersPopover();
              }}
              variant={filters.scaleType || filters.notes.length > 0 ? 'filled' : 'outlined'}
              color={filters.scaleType || filters.notes.length > 0 ? 'primary' : 'default'}
              deleteIcon={filters.scaleType || filters.notes.length > 0 ? <Cancel /> : undefined}
              onDelete={e => {
                e.stopPropagation();
                clearFilter('scaleType');
                clearFilter('notes');
              }}
              sx={{ width: '100%', justifyContent: 'space-between' }}
            />
          </Box>
        </Popover>
      )}
    </Box>
  );
};

export default BeatFilters;
