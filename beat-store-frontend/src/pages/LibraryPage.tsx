import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  Slider,
  Checkbox,
} from '@mui/material';
import {
  PlayArrowRounded,
  MoreHoriz,
  PauseRounded,
  FileDownloadRounded,
  TuneRounded,
  Cancel,
} from '@mui/icons-material';
import { useGetBeatsQuery, useCheckPurchaseQuery, useDownloadBeatMutation } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';
import { usePlaybackStore } from '@/store/playBackStore';
import { useToastStore } from '@/store/toastStore';
import { levelLabelMap, levelColorMap } from '@/constants/licenseMaps';
import { useResponsive } from '@/hooks/useResponsive';
import JSZip from 'jszip';
import { generateLicenseAgreementPDF } from '@/utils/pdfUtils';

/**
 * Generate a consistent random color based on a string
 */
const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate vibrant colors (avoid too dark or too light)
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

interface PurchasedBeat {
  beat: any;
  license: 'mp3' | 'wav' | 'stems' | null;
  duration: number | null;
}

type BeatFiltersType = {
  genre: string[];
  bpm: [number, number];
  scaleType: string;
  notes: string[];
};

/**
 * Normalize scale display: capitalize "Major" and "Minor" while keeping the note as is
 */
const normalizeScaleDisplay = (scale: string): string => {
  const parts = scale.split(' ');
  if (parts.length < 2) return scale;
  const [note, type] = parts;
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'major') return `${note} Major`;
  if (normalizedType === 'minor') return `${note} Minor`;
  return scale;
};

// Component to check purchases for a single beat
const BeatPurchaseChecker = ({
  beat,
  onPurchased,
}: {
  beat: any;
  onPurchased: (license: 'mp3' | 'wav' | 'stems' | null) => void;
}) => {
  const { isLoggedIn } = useAuthStore();

  // Skip queries if beat ID is invalid or user is not logged in
  const isValidBeatId = beat?.id && beat.id > 0;
  const shouldSkip = !isLoggedIn || !isValidBeatId;

  const { data: mp3Check } = useCheckPurchaseQuery(
    { beatId: beat.id, downloadType: 'mp3' },
    { skip: shouldSkip },
  );
  const { data: wavCheck } = useCheckPurchaseQuery(
    { beatId: beat.id, downloadType: 'wav' },
    { skip: shouldSkip },
  );
  const { data: stemsCheck } = useCheckPurchaseQuery(
    { beatId: beat.id, downloadType: 'stems' },
    { skip: shouldSkip },
  );

  useEffect(() => {
    let license: 'mp3' | 'wav' | 'stems' | null = null;

    // Check in order: stems > wav > mp3 (highest to lowest)
    if (stemsCheck?.has_purchase) {
      license = 'stems';
    } else if (wavCheck?.has_purchase) {
      license = 'wav';
    } else if (mp3Check?.has_purchase) {
      license = 'mp3';
    }

    onPurchased(license);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp3Check, wavCheck, stemsCheck]);

  return null;
};

const LibraryPage = () => {
  const { isLoggedIn, userProfile } = useAuthStore();
  const { currentBeatId, isPlaying, play, pause, setBeat } = usePlaybackStore();
  const { data: beats = [], isLoading: isLoadingBeats } = useGetBeatsQuery();
  const { isTabletOrSmaller, isSmallScreen } = useResponsive();
  const [purchasedBeats, setPurchasedBeats] = useState<PurchasedBeat[]>([]);
  const [durations, setDurations] = useState<Record<number, number | null>>({});
  const [purchaseStatus, setPurchaseStatus] = useState<Record<number, 'mp3' | 'wav' | 'stems' | null>>({});
  const [menuAnchor, setMenuAnchor] = useState<{ beatId: number; element: HTMLElement } | null>(null);
  const [isDownloading, setIsDownloading] = useState<Record<number, boolean>>({});
  const [downloadBeatMutation] = useDownloadBeatMutation();
  const { show } = useToastStore();
  const [filtersPopoverAnchor, setFiltersPopoverAnchor] = useState<HTMLElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<BeatFiltersType>({
    genre: [],
    bpm: [60, 200],
    scaleType: '',
    notes: [],
  });
  const [tempFilters, setTempFilters] = useState<BeatFiltersType>(filters);

  // Get all purchased beats (unfiltered) for filter options
  const allPurchasedBeats = useMemo(() => {
    const purchased: PurchasedBeat[] = [];
    beats.forEach(beat => {
      const license = purchaseStatus[beat.id];
      if (license) {
        purchased.push({ beat, license, duration: durations[beat.id] ?? null });
      }
    });
    return purchased;
  }, [beats, purchaseStatus, durations]);

  // Get filter options from all purchased beats
  const uniqueGenres = Array.from(new Set(allPurchasedBeats.map(({ beat }) => beat.genre)));
  const bpmValues = allPurchasedBeats.map(({ beat }) => beat.bpm);
  const minBpm = bpmValues.length > 0 ? Math.min(...bpmValues) : 60;
  const maxBpm = bpmValues.length > 0 ? Math.max(...bpmValues) : 200;
  const rootNotes = Array.from(
    new Set(allPurchasedBeats.map(({ beat }) => beat.scale.split(' ')[0]).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const scaleTypes: string[] = [];
  const seenTypes = new Set<string>();
  for (const { beat } of allPurchasedBeats) {
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

  // Update purchased beats when purchase status changes and apply filters
  useEffect(() => {
    // Apply filters to all purchased beats
    const filtered = allPurchasedBeats.filter(({ beat }) => {
      const genreMatch = filters.genre.length === 0 || filters.genre.includes(beat.genre);
      const bpmMatch = beat.bpm >= filters.bpm[0] && beat.bpm <= filters.bpm[1];
      const [note, type] = beat.scale.split(' ');
      const scaleTypeMatch =
        !filters.scaleType || type.toLowerCase() === filters.scaleType.toLowerCase();
      const noteMatch = filters.notes.length === 0 || filters.notes.includes(note);
      return genreMatch && bpmMatch && scaleTypeMatch && noteMatch;
    });

    setPurchasedBeats(filtered);
  }, [allPurchasedBeats, filters]);

  // Calculate duration for each purchased beat
  useEffect(() => {
    purchasedBeats.forEach(({ beat }) => {
      if (durations[beat.id] !== undefined) return; // Already calculated

      const audioUrl = beat.snippet_mp3 || beat.mp3_file;
      if (!audioUrl) {
        setDurations(prev => ({ ...prev, [beat.id]: null }));
        return;
      }

      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setDurations(prev => ({ ...prev, [beat.id]: audio.duration }));
      });
      audio.addEventListener('error', () => {
        setDurations(prev => ({ ...prev, [beat.id]: null }));
      });
    });
  }, [purchasedBeats, durations]);

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null || isNaN(seconds)) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, beatId: number) => {
    event.stopPropagation();
    setMenuAnchor({ beatId, element: event.currentTarget });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleOpenFiltersPopover = (event: React.MouseEvent<HTMLElement>) => {
    setFiltersPopoverAnchor(event.currentTarget);
    setTempFilters(filters);
  };

  const handleCloseFiltersPopover = () => {
    setFiltersPopoverAnchor(null);
    setActiveFilter(null);
  };

  const handleOpenFilter = (_event: React.MouseEvent<HTMLElement>, filter: string) => {
    setActiveFilter(filter);
    setTempFilters(filters);
  };

  const handleCloseFilter = () => {
    setActiveFilter(null);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    handleCloseFilter();
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

  const filtersPopoverOpen = Boolean(filtersPopoverAnchor);
  const filterMenuOpen = Boolean(activeFilter);

  const hasActiveFilters =
    filters.genre.length > 0 ||
    filters.bpm[0] !== 60 ||
    filters.bpm[1] !== 200 ||
    Boolean(filters.scaleType) ||
    filters.notes.length > 0;

  const handleDownload = async (beat: any, downloadType: 'mp3' | 'wav' | 'stems') => {
    if (!beat) return;

    console.log('Download initiated:', { beatId: beat.id, beatName: beat.name, downloadType });

    try {
      setIsDownloading(prev => ({ ...prev, [beat.id]: true }));
      handleMenuClose();

      console.log('Calling download API:', { beatId: beat.id, downloadType });

      // Use RTK Query mutation for download
      const beatBlob = await downloadBeatMutation({
        beatId: beat.id,
        downloadType,
      }).unwrap();

      // Generate License Agreement PDF
      const fullName = userProfile
        ? [
            userProfile.first_name,
            userProfile.middle_initial ? `${userProfile.middle_initial}.` : null,
            userProfile.last_name,
          ]
            .filter(Boolean)
            .join(' ')
        : 'User';

      const pdfBlob = generateLicenseAgreementPDF({
        beatName: beat.name,
        downloadType,
        signatureName: fullName,
        date: new Date().toLocaleDateString(),
      });

      // Create zip file
      const zip = new JSZip();

      // Add beat file to zip
      const fileExtension = downloadType === 'stems' ? 'zip' : downloadType;
      const beatFileName = `${beat.name}_${downloadType}.${fileExtension}`;
      zip.file(beatFileName, beatBlob);

      // Add PDF to zip
      zip.file('License_Agreement.pdf', pdfBlob);

      // Generate zip blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${beat.name}_${downloadType}_with_license.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      console.error('Download error details:', {
        beatId: beat.id,
        beatName: beat.name,
        downloadType,
        error: err,
      });
      show('Download failed. Please try again.', 'error');
    } finally {
      setIsDownloading(prev => ({ ...prev, [beat.id]: false }));
    }
  };

  const glassEffectSx = {
    backgroundColor: 'rgba(40, 40, 40, 0.2)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  };

  return (
    <Box sx={{ 
      px: 3, 
      pt: isSmallScreen ? '80px' : '40px', 
      pb: 2,
      mt: isSmallScreen ? '24px' : 0,
      width: '100%',
      ml: { xs: 0 },
      '@media (min-width: 769px)': {
        width: 'calc(100% - 80px)',
      },
    }}>
      {!isLoggedIn ? (
        <Typography variant="body1" color="text.secondary">
          Please sign in to view your library.
        </Typography>
      ) : isLoadingBeats ? (
        <Box sx={glassEffectSx} p={2}>
          <Skeleton variant="rectangular" height={400} />
        </Box>
      ) : (
        <>
          {/* Hidden components to check purchases for all beats */}
          {beats
            .filter(beat => beat?.id && beat.id > 0)
            .map(beat => (
              <BeatPurchaseChecker
                key={beat.id}
                beat={beat}
                onPurchased={license => {
                  setPurchaseStatus(prev => ({ ...prev, [beat.id]: license }));
                }}
              />
            ))}

          {purchasedBeats.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              Your library is empty. Purchase beats to add them to your library.
            </Typography>
          ) : (
            <>
              <TableContainer
              sx={{
                ...glassEffectSx,
                maxHeight: 'calc(100vh - 200px)',
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.3)',
                  },
                },
              }}
            >
              <Table stickyHeader>
                <TableHead
                  sx={{
                    display: isTabletOrSmaller ? 'none' : 'table-header-group',
                    '& .MuiTableCell-head': {
                      paddingTop: '8px',
                      paddingBottom: '8px',
                    },
                  }}
                >
                  <TableRow>
                    <TableCell
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: 600,
                        backgroundColor: 'rgba(40, 40, 40, 0.4)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        width: '60px',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          right: 0,
                          top: '16px',
                          bottom: '16px',
                          width: '.06rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <MoreHoriz sx={{ fontSize: '18px', opacity: 0.7 }} />
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: 600,
                        backgroundColor: 'rgba(40, 40, 40, 0.4)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        width: isTabletOrSmaller ? 'fit-content' : undefined,
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          right: 0,
                          top: '16px',
                          bottom: '16px',
                          width: '.06rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                      }}
                    >
                      Name
                    </TableCell>
                    {!isTabletOrSmaller && (
                      <>
                        <TableCell
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 600,
                            backgroundColor: 'rgba(40, 40, 40, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            width: '80px',
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              top: '16px',
                              bottom: '16px',
                              width: '.06rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          Duration
                        </TableCell>
                        <TableCell
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 600,
                            backgroundColor: 'rgba(40, 40, 40, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            width: '80px',
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              top: '16px',
                              bottom: '16px',
                              width: '.06rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          BPM
                        </TableCell>
                        <TableCell
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 600,
                            backgroundColor: 'rgba(40, 40, 40, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              top: '16px',
                              bottom: '16px',
                              width: '.06rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          Scale
                        </TableCell>
                        <TableCell
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 600,
                            backgroundColor: 'rgba(40, 40, 40, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              top: '16px',
                              bottom: '16px',
                              width: '.06rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          Genre
                        </TableCell>
                        <TableCell
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 600,
                            backgroundColor: 'rgba(40, 40, 40, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            position: 'relative',
                          }}
                        >
                          License
                        </TableCell>
                      </>
                    )}
                    <TableCell
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: 600,
                        backgroundColor: 'rgba(40, 40, 40, 0.4)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        width: '60px',
                        paddingRight: '10px',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <IconButton
                          onClick={handleOpenFiltersPopover}
                          size="small"
                          sx={{
                            color: hasActiveFilters
                              ? 'var(--beat-palette-primary-main)'
                              : 'rgba(255, 255, 255, 0.7)',
                            padding: '8px',
                            backgroundColor: hasActiveFilters
                              ? 'rgba(var(--beat-palette-primary-mainChannel) / 0.2)'
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: hasActiveFilters
                                ? 'rgba(var(--beat-palette-primary-mainChannel) / 0.3)'
                                : 'rgba(255, 255, 255, 0.1)',
                            },
                          }}
                        >
                          <TuneRounded sx={{ fontSize: '20px' }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchasedBeats.map(({ beat, license }, index) => {
                    const fallbackColor = generateColorFromString(beat.name);
                    const isCurrent = currentBeatId === beat.id;
                    const audioUrl = beat.mp3_file || beat.snippet_mp3 || null;

                    const handleRowClick = () => {
                      if (!audioUrl) return;
                      if (isCurrent && isPlaying) {
                        pause();
                      } else {
                        setBeat(beat.id, audioUrl);
                        play();
                      }
                    };

                    return (
                      <TableRow
                        key={beat.id}
                        hover
                        className="library-table-row"
                        onClick={handleRowClick}
                        sx={{
                          border: 'none',
                          cursor: audioUrl ? 'pointer' : 'default',
                          backgroundColor: index % 2 === 0
                            ? 'rgba(255, 255, 255, 0.02)'
                            : 'rgba(255, 255, 255, 0.05)',
                          '&:hover': {
                            backgroundColor: index % 2 === 0
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(255, 255, 255, 0.08)',
                            '& .cover-art-image': {
                              opacity: 0,
                            },
                            '& .play-button-overlay': {
                              opacity: 1,
                            },
                          },
                        }}
                      >
                        <TableCell sx={{ border: 'none', width: '60px' }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative',
                              width: 24,
                              height: 24,
                              margin: '0 auto',
                              '& .cover-art-image': {
                                width: 24,
                                height: 24,
                                borderRadius: '100px',
                              },
                              '& .play-button-overlay': {
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                opacity: 0,
                                pointerEvents: 'none',
                              },
                            }}
                          >
                            {isCurrent && isPlaying ? (
                              <IconButton
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRowClick();
                                }}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  padding: 0,
                                  '& .MuiSvgIcon-root': {
                                    color: '#fff',
                                    fontSize: '24px',
                                  },
                                }}
                              >
                                <PauseRounded />
                              </IconButton>
                            ) : (
                              <>
                                {beat.cover_art ? (
                                  <Avatar
                                    className="cover-art-image"
                                    src={beat.cover_art}
                                    alt={beat.name}
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '100px',
                                    }}
                                  />
                                ) : (
                                  <Box
                                    className="cover-art-image"
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '100px',
                                      backgroundColor: fallbackColor,
                                    }}
                                  />
                                )}
                                <IconButton
                                  className="play-button-overlay"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRowClick();
                                  }}
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    padding: 0,
                                    '& .MuiSvgIcon-root': {
                                      color: '#fff',
                                      fontSize: '24px',
                                    },
                                  }}
                                >
                                  <PlayArrowRounded />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#fff', border: 'none', width: isTabletOrSmaller ? '100%' : undefined }}>
                          {beat.name}
                        </TableCell>
                      {!isTabletOrSmaller && (
                        <>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', border: 'none', width: '80px' }}>
                            {formatDuration(durations[beat.id] ?? null)}
                          </TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', border: 'none', width: '80px' }}>
                            {beat.bpm}
                          </TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', border: 'none' }}>
                            {normalizeScaleDisplay(beat.scale)}
                          </TableCell>
                          <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', border: 'none' }}>{beat.genre}</TableCell>
                          <TableCell sx={{ border: 'none' }}>
                            {license && (
                              <Chip
                                label={levelLabelMap[license]}
                                size="small"
                                sx={{
                                  backgroundColor: levelColorMap[license] + '20',
                                  color: levelColorMap[license],
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  border: `1px solid ${levelColorMap[license]}40`,
                                }}
                              />
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell
                        sx={{
                          border: 'none',
                          padding: 0,
                          width: isTabletOrSmaller ? 'fit-content' : '60px',
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(to right, transparent 0%, ${
                              index % 2 === 0
                                ? 'rgba(255, 255, 255, 0.02)'
                                : 'rgba(255, 255, 255, 0.05)'
                            } 100%)`,
                            paddingRight: 1,
                          }}
                        >
                          <IconButton
                            onClick={e => handleMenuOpen(e, beat.id)}
                            size="small"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              padding: '8px',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              },
                            }}
                          >
                            <MoreHoriz />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Menu
              anchorEl={menuAnchor?.element}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  backgroundColor: 'rgba(40, 40, 40, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minWidth: '180px',
                },
              }}
            >
              {menuAnchor &&
                purchasedBeats
                  .find(({ beat: b }) => b.id === menuAnchor.beatId)
                  ?.license && (
                  <MenuItem
                    onClick={() => {
                      const beat = purchasedBeats.find(({ beat: b }) => b.id === menuAnchor.beatId)?.beat;
                      const license = purchasedBeats.find(({ beat: b }) => b.id === menuAnchor.beatId)?.license;
                      if (beat && license) {
                        handleDownload(beat, license);
                      }
                    }}
                    disabled={isDownloading[menuAnchor.beatId]}
                    sx={{
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <FileDownloadRounded sx={{ mr: 1, fontSize: '18px' }} />
                    Download Beat
                  </MenuItem>
                )}
            </Menu>
            <Popover
              open={filtersPopoverOpen}
              anchorEl={filtersPopoverAnchor}
              onClose={handleCloseFiltersPopover}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: '12px',
                    backgroundColor: 'rgba(40, 40, 40, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    mt: 0.5,
                    minWidth: 280,
                  },
                },
              }}
            >
              <Box p={2.5}>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Chip
                    label="Genre"
                    onClick={e => handleOpenFilter(e, 'genre')}
                    variant={filters.genre.length > 0 ? 'filled' : 'outlined'}
                    color={filters.genre.length > 0 ? 'primary' : 'default'}
                    deleteIcon={filters.genre.length > 0 ? <Cancel /> : undefined}
                    onDelete={filters.genre.length > 0 ? () => clearFilter('genre') : undefined}
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />

                  <Chip
                    label="BPM"
                    onClick={e => handleOpenFilter(e, 'bpm')}
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
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />

                  <Chip
                    label="Scale"
                    onClick={e => handleOpenFilter(e, 'scale')}
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
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />
                </Box>
              </Box>
            </Popover>
            <Popover
              open={filterMenuOpen}
              anchorEl={filtersPopoverAnchor}
              onClose={handleCloseFilter}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: '12px',
                    backgroundColor: 'rgba(40, 40, 40, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    mt: 0.5,
                    minWidth: 260,
                  },
                },
              }}
            >
              {filterMenuOpen && (
                <Box p={2.5}>
                  {activeFilter === 'genre' && (
                    <Box>
                      <Typography fontSize="14px" gutterBottom sx={{ color: '#fff' }}>
                        Genres
                      </Typography>
                      {uniqueGenres.map(g => (
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
                            sx={{ color: '#fff' }}
                          />
                          <Typography variant="body2" sx={{ color: '#fff' }}>
                            {g}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {activeFilter === 'bpm' && (
                    <Box>
                      <Typography fontSize="14px" gutterBottom sx={{ color: '#fff' }}>
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
                        sx={{ color: '#1db954' }}
                      />
                    </Box>
                  )}

                  {activeFilter === 'scale' && (
                    <Box>
                      <Typography fontSize="14px" gutterBottom sx={{ color: '#fff' }}>
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
                        <Typography fontSize="14px" gutterBottom sx={{ color: '#fff' }}>
                          Notes
                        </Typography>
                        <Box sx={{ maxHeight: '280px', overflow: 'auto' }}>
                          {rootNotes.map(n => {
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
                                  sx={{ color: '#fff' }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isDisabled ? 'rgba(255, 255, 255, 0.5)' : '#fff',
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
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      color="primary"
                      label="Apply"
                      onClick={handleApplyFilters}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                </Box>
              )}
            </Popover>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default LibraryPage;
