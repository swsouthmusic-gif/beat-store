import { useState } from 'react';
import { Box, Chip, Typography, Slider, Popover, Checkbox } from '@mui/material';
import { Cancel, TuneRounded } from '@mui/icons-material';

export type BeatFiltersType = {
  genre: string[];
  bpm: [number, number];
  scaleType: string;
  notes: string[];
};

interface BeatFiltersProps {
  filters: BeatFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<BeatFiltersType>>;
  genres: string[];
  minBpm: number;
  maxBpm: number;
  scaleTypes: string[];
  notes: string[];
}

const BeatFilters = ({
  filters,
  setFilters,
  genres,
  minBpm,
  maxBpm,
  scaleTypes,
  notes,
}: BeatFiltersProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [tempFilters, setTempFilters] = useState<BeatFiltersType>(filters);

  const handleOpen = (event: React.MouseEvent<HTMLElement>, filter: string) => {
    setAnchorEl(event.currentTarget);
    setActiveFilter(filter);
    setTempFilters(filters);
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

  const open = Boolean(anchorEl);

  return (
    <Box mb={2}>
      <Box display="flex" alignItems="center" gap={2}>
        <TuneRounded fontSize="small" sx={{ color: 'var(--beat-palette-text-secondary)' }} />
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
          deleteIcon={filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? <Cancel /> : undefined}
          onDelete={
            filters.bpm[0] !== 60 || filters.bpm[1] !== 200 ? () => clearFilter('bpm') : undefined
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
      </Box>

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
                      onClick={() => setTempFilters(prev => ({ ...prev, scaleType: s, notes: [] }))}
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
    </Box>
  );
};

export default BeatFilters;
