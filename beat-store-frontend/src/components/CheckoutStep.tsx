import { useState } from 'react';
import { Box, Typography, Button, Chip, Divider, Alert } from '@mui/material';
import { ArrowBackRounded, Security, Download } from '@mui/icons-material';
import { genreColors } from '@/constants/genreColors';
import { levelLabelMap, levelColorMap, iconTypeMap } from '@/constants/licenseMaps';
import { useDownloadBeatMutation } from '@/store/beatApi';
import { useAuthStore } from '@/store/authStore';
import type { BeatType } from '@/store/beatApi';
import StripeProvider from './StripeProvider';
import StripePaymentForm from './StripePaymentForm';
import DownloadLoading from './DownloadLoading';

type LicenseInfo = {
  type: 'mp3' | 'wav' | 'stems';
  label: string; // Starter/Pro/Elite
  color: string; // hex
  includes: string[];
  price: number | string | null | undefined;
};

interface CheckoutStepProps {
  onBack: () => void;
  onComplete: () => void;
  beat?: BeatType | null;
  selectedDownloadType?: 'mp3' | 'wav' | 'stems' | null;
  selectedLicense?: LicenseInfo | null;
  playButton?: React.ReactNode;
  onRequestAuth?: (mode: 'login' | 'forgot' | 'signup') => void;
  onDownloadStateChange?: (isDownloading: boolean) => void;
}

const CheckoutStep = ({
  onBack,
  onComplete,
  beat,
  selectedDownloadType,
  selectedLicense,
  playButton,
  onRequestAuth,
  onDownloadStateChange,
}: CheckoutStepProps) => {
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Auth and API hooks
  const { isLoggedIn } = useAuthStore();
  const [downloadBeat, { isLoading: isDownloading }] = useDownloadBeatMutation();

  const handlePaymentSuccess = (downloadUrl: string) => {
    setPurchaseSuccess(true);
    setDownloadUrl(downloadUrl);
    setError(null);

    // Trigger download
    handleDownload();
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleDownload = async () => {
    if (!beat || !selectedDownloadType) return;

    try {
      // Notify parent component that download is starting
      onDownloadStateChange?.(true);

      // Use RTK Query mutation for download
      const blob = await downloadBeat({
        beatId: beat.id,
        downloadType: selectedDownloadType,
      }).unwrap();

      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      // Set correct file extension
      const fileExtension = selectedDownloadType === 'stems' ? 'zip' : selectedDownloadType;
      link.download = `${beat.name}_${selectedDownloadType}.${fileExtension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Download failed. Please try again.');
    } finally {
      // Notify parent component that download is finished
      onDownloadStateChange?.(false);
    }
  };

  return (
    <>
      {/* Download Loading Overlay */}
      <DownloadLoading
        isVisible={isDownloading}
        downloadType={selectedDownloadType || 'mp3'}
        beatName={beat?.name || 'Beat'}
      />

      <Box className="checkout-step" sx={{ paddingBottom: '8px', paddingTop: '8px' }}>
        {/* Summary Section */}
        {beat && (
          <Box className="beat-selected-container">
            <Box className="beat-selected">
              <Box className="beat-cover-container">
                <img
                  src={beat.cover_art}
                  alt={beat.name}
                  className="beat-cover-art"
                  crossOrigin="anonymous"
                />

                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, .36)',
                    borderRadius: '8px',
                    zIndex: 50,
                  }}
                />

                {/* Play button */}
                {playButton && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 100,
                    }}
                  >
                    {playButton}
                  </Box>
                )}
              </Box>
              <Box>
                <Typography fontWeight={600} sx={{ paddingBottom: '4px' }}>
                  {beat.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    size="small"
                    label={beat.genre}
                    sx={{
                      backgroundColor: genreColors[beat.genre],
                      color: '#fff',
                    }}
                  />
                  <Typography variant="body2" color="text.primary" sx={{ opacity: '.8' }}>
                    {beat.bpm} BPM • {beat.scale}
                  </Typography>
                </Box>
              </Box>
            </Box>
            {selectedDownloadType && selectedLicense && (
              <Box className="summary">
                {/* License Package Chip */}
                <Chip
                  label={levelLabelMap[selectedDownloadType]}
                  sx={{
                    backgroundColor: levelColorMap[selectedDownloadType] + '20',
                    color: levelColorMap[selectedDownloadType],
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: `1px solid ${levelColorMap[selectedDownloadType]}40`,
                  }}
                />

                {/* Icon Types */}
                <Box
                  className="icon-types"
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  {iconTypeMap[selectedDownloadType].map((iconType, index) => (
                    <Chip
                      key={index}
                      label={iconType.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Box>

                {/* Total Price */}
                <Box className="total-price-container">
                  <Typography variant="body2" className="total-price-label">
                    Total:
                  </Typography>
                  <Typography
                    variant="h6"
                    className="total-price"
                    sx={{
                      color: levelColorMap[selectedDownloadType],
                    }}
                  >
                    ${selectedLicense.price}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Authentication Check */}
        {!isLoggedIn && !purchaseSuccess && (
          <Box className="checkout-form">
            <Typography variant="h6" sx={{ paddingBottom: '16px' }}>
              Sign In Required
            </Typography>
            <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
              You need to sign in to complete your purchase.
            </Alert>
            <Button
              variant="contained"
              onClick={() => onRequestAuth?.('login')}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                background: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1aa34a 0%, #1db954 100%)',
                },
              }}
            >
              Sign In
            </Button>
          </Box>
        )}

        {/* Stripe Payment Form */}
        {isLoggedIn && !purchaseSuccess && beat && selectedDownloadType && selectedLicense && (
          <Box className="checkout-form">
            <Typography variant="h6" sx={{ paddingBottom: '16px' }}>
              Complete Your Purchase
            </Typography>

            <StripeProvider
              clientSecret={clientSecret || undefined}
              amount={selectedLicense.price ? parseFloat(selectedLicense.price.toString()) : 0}
              currency="usd"
            >
              <StripePaymentForm
                beat={beat}
                selectedDownloadType={selectedDownloadType}
                selectedLicense={selectedLicense}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                onClientSecretChange={setClientSecret}
                clientSecret={clientSecret}
              />
            </StripeProvider>
          </Box>
        )}

        {/* Success/Error Messages */}
        {purchaseSuccess && (
          <Box sx={{ mb: 3 }}>
            <Alert
              severity="success"
              sx={{
                mb: 2,
                borderRadius: '12px',
              }}
            >
              Payment successful! Your download should start automatically.
            </Alert>
            {downloadUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={() => handleDownload()}
                  startIcon={<Download />}
                  disabled={isDownloading}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #43a047 0%, #5cb85c 100%)',
                    },
                  }}
                >
                  {isDownloading ? 'Downloading...' : 'Download Again'}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Terms and Security */}
        <Box className="actions-footer">
          {/* Action Buttons */}
          <Box
            className="checkout-actions"
            sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}
          >
            {!purchaseSuccess && (
              <Button
                variant="outlined"
                onClick={onBack}
                startIcon={<ArrowBackRounded />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                Back
              </Button>
            )}
            {/* <Button
            variant="contained"
            onClick={onComplete}
            disabled={!purchaseSuccess}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              background: purchaseSuccess
                ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                : 'rgba(255,255,255,0.2)',
              color: purchaseSuccess ? 'white' : 'rgba(255, 255, 255, .3)',
              '&:hover': {
                background: purchaseSuccess
                  ? 'linear-gradient(135deg, #43a047 0%, #5cb85c 100%)'
                  : 'rgba(0, 0, 0, 0.12)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, .3)',
              },
            }}
          >
            Download
          </Button> */}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default CheckoutStep;
