import { Modal, Box, Typography, Button, IconButton, Chip } from '@mui/material';
import { Close as CloseIcon, Download, ArrowUpward } from '@mui/icons-material';
import type { BeatType } from '@/store/beatApi';
import { levelLabelMap, levelColorMap } from '@/constants/licenseMaps';

interface AlreadyPurchasedModalProps {
  open: boolean;
  onClose: () => void;
  beat: BeatType | null;
  downloadType: 'mp3' | 'wav' | 'stems' | null;
  onDownload: () => void;
  onUpgrade?: (upgradeType: 'wav' | 'stems') => void;
  isDownloading?: boolean;
}

const AlreadyPurchasedModal = ({
  open,
  onClose,
  beat,
  downloadType,
  onDownload,
  onUpgrade,
  isDownloading = false,
}: AlreadyPurchasedModalProps) => {
  const modalSx = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90vw', sm: 400 },
    maxHeight: '90vh',
    overflow: 'auto',
    bgcolor: 'rgba(15, 15, 15, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
    p: 4,
  };

  const titleSx = {
    color: '#fff',
    fontWeight: 600,
    fontSize: '1.5rem',
    mb: 1,
    textAlign: 'center' as const,
  };

  const subtitleSx = {
    color: 'rgba(255, 255, 255, 0.6)',
    mb: 3,
    textAlign: 'center' as const,
    fontSize: '0.875rem',
  };

  const primaryButtonSx = {
    width: '100%',
    py: 1.5,
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.875rem',
    background: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)',
    color: '#fff',
    '&:hover': {
      background: 'linear-gradient(135deg, #1aa34a 0%, #1db954 100%)',
    },
    '&:disabled': {
      background: 'rgba(255, 255, 255, 0.2)',
      color: 'rgba(255, 255, 255, 0.5)',
    },
  };

  const secondaryButtonSx = {
    width: '100%',
    py: 1.5,
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 500,
    fontSize: '0.875rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      borderColor: 'rgba(255, 255, 255, 0.4)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
  };

  const downloadTypeLabel =
    downloadType === 'mp3'
      ? 'MP3'
      : downloadType === 'wav'
        ? 'WAV'
        : downloadType === 'stems'
          ? 'Stems'
          : '';

  // Determine available upgrades
  const availableUpgrades: Array<{ type: 'wav' | 'stems'; label: string; price: string | null }> =
    [];

  // Helper to check if a price is valid (not null, not empty string)
  const hasValidPrice = (price: string | null | undefined): boolean => {
    return price !== null && price !== undefined && price.trim() !== '';
  };

  if (downloadType === 'mp3') {
    // Starter purchased - can upgrade to Pro or Elite
    if (hasValidPrice(beat?.wav_price)) {
      availableUpgrades.push({
        type: 'wav',
        label: levelLabelMap.wav,
        price: beat!.wav_price,
      });
    }
    if (hasValidPrice(beat?.stems_price)) {
      availableUpgrades.push({
        type: 'stems',
        label: levelLabelMap.stems,
        price: beat!.stems_price,
      });
    }
  } else if (downloadType === 'wav') {
    // Pro purchased - can upgrade to Elite
    if (hasValidPrice(beat?.stems_price)) {
      availableUpgrades.push({
        type: 'stems',
        label: levelLabelMap.stems,
        price: beat!.stems_price,
      });
    }
  }

  const upgradeButtonSx = {
    width: '100%',
    py: 1.5,
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.875rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    '&:hover': {
      borderColor: 'rgba(255, 255, 255, 0.4)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="already-purchased-modal-title"
      aria-describedby="already-purchased-modal-description"
      slotProps={{
        backdrop: {
          style: {
            background: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(2px) saturate(160%)',
          },
        },
      }}
    >
      <Box sx={modalSx}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'rgba(255, 255, 255, 0.6)',
            '&:hover': { color: '#fff' },
          }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography id="already-purchased-modal-title" variant="h4" sx={titleSx}>
            Already Purchased
          </Typography>
          <Typography id="already-purchased-modal-description" variant="body2" sx={subtitleSx}>
            You've already purchased this {downloadTypeLabel} download for{' '}
            {beat?.name ?? 'this beat'}. You can download it again below.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={onDownload}
            disabled={isDownloading || !beat || !downloadType}
            sx={primaryButtonSx}
          >
            {isDownloading ? 'Downloading...' : 'Download Again'}
          </Button>

          {availableUpgrades.length > 0 && onUpgrade ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  mb: 0.5,
                }}
              >
                Upgrade Options
              </Typography>
              {availableUpgrades.map(upgrade => (
                <Button
                  key={upgrade.type}
                  variant="outlined"
                  startIcon={<ArrowUpward />}
                  onClick={() => onUpgrade(upgrade.type)}
                  disabled={!beat}
                  sx={{
                    ...upgradeButtonSx,
                    borderColor: levelColorMap[upgrade.type],
                    color: levelColorMap[upgrade.type],
                    '&:hover': {
                      borderColor: levelColorMap[upgrade.type],
                      backgroundColor: `${levelColorMap[upgrade.type]}20`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography sx={{ flex: 1, textAlign: 'left' }}>
                      Upgrade to {upgrade.label}
                    </Typography>
                    {upgrade.price && (
                      <Chip
                        label={upgrade.price}
                        size="small"
                        sx={{
                          backgroundColor: `${levelColorMap[upgrade.type]}20`,
                          color: levelColorMap[upgrade.type],
                          border: `1px solid ${levelColorMap[upgrade.type]}`,
                          fontSize: '0.75rem',
                          height: '24px',
                        }}
                      />
                    )}
                  </Box>
                </Button>
              ))}
            </Box>
          ) : null}

          <Button variant="outlined" onClick={onClose} sx={secondaryButtonSx}>
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AlreadyPurchasedModal;
